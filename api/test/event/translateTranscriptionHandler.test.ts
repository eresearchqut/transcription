import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  GetTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";
import { marshall } from "@aws-sdk/util-dynamodb";
import { sdkStreamMixin } from "@smithy/util-stream";

import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Transcription } from "model";
import { Readable } from "stream";

import { handler } from "../../src/event/translateTranscriptionHandler";
import dynamoDBClient from "../../src/repository/dynamoDBClient";
import { getResource } from "../../src/repository/repository";

const tableName = process.env.TABLE_NAME || "transcription";
const bucket = process.env.BUCKET_NAME || "transcriptions";

const identityId = "76c65a59-1c57-489b-be96-020ceaa9675a";
const jobId = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const jobName = `${identityId}_${jobId}`;

const transcript = {
  results: {
    transcripts: [{ transcript: "Hello world. How are you?" }],
    speaker_labels: {
      segments: [
        { start_time: "0.0", end_time: "2.0", speaker_label: "spk_0" },
        { start_time: "2.0", end_time: "4.0", speaker_label: "spk_1" },
      ],
    },
    segments: [
      {
        start_time: "0.0",
        end_time: "2.0",
        alternatives: [{ transcript: "Hello world." }],
      },
      {
        start_time: "2.0",
        end_time: "4.0",
        alternatives: [{ transcript: "How are you?" }],
      },
    ],
    items: [
      {
        start_time: "0.0",
        end_time: "0.5",
        alternatives: [{ content: "Hello" }],
        type: "pronunciation",
      },
    ],
  },
};

const putRecord = (metadata: Record<string, unknown>) =>
  dynamoDBClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall({ pk: identityId, sk: jobId, metadata }),
    }),
  );

const mockTranscript = (s3ClientMock: ReturnType<typeof mockClient>) =>
  s3ClientMock.on(GetObjectCommand).resolves({
    Body: sdkStreamMixin(Readable.from(JSON.stringify(transcript))),
  } as never);

describe("translateTranscriptionHandler", () => {
  const s3ClientMock = mockClient(S3Client);
  const transcribeClientMock = mockClient(TranscribeClient);
  const translateClientMock = mockClient(TranslateClient);

  beforeEach(() => {
    s3ClientMock.reset();
    transcribeClientMock.reset();
    translateClientMock.reset();
  });

  test("translates each segment and writes a translated transcript", async () => {
    await putRecord({ targetlanguage: "es" });
    transcribeClientMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { LanguageCode: "en-US" } });
    mockTranscript(s3ClientMock);
    translateClientMock
      .on(TranslateTextCommand)
      .resolves({ TranslatedText: "translated" });

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toContain("Translated 2 segments from en to es");
    expect(translateClientMock).toHaveReceivedCommandTimes(
      TranslateTextCommand,
      2,
    );
    expect(translateClientMock).toHaveReceivedCommandWith(
      TranslateTextCommand,
      {
        SourceLanguageCode: "en",
        TargetLanguageCode: "es",
        Text: "Hello world.",
      },
    );
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: `transcription/${identityId}/${jobId}.json`,
    });
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      Key: `users/${identityId}/translations/${jobId}/es`,
    });

    const put = s3ClientMock.commandCalls(PutObjectCommand)[0].args[0].input;
    const written = JSON.parse(put.Body as string);
    expect(written.results.segments).toHaveLength(2);
    expect(written.results.segments[0].alternatives[0].transcript).toEqual(
      "translated",
    );
    expect(written.results.segments[0].start_time).toEqual("0.0");
    expect(written.results.transcripts[0].transcript).toEqual(
      "translated translated",
    );
    expect(written.results.speaker_labels).toEqual(
      transcript.results.speaker_labels,
    );
    // word-level items are dropped (no per-word translation/timing)
    expect(written.results.items).toBeUndefined();

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationKey).toEqual(
      `users/${identityId}/translations/${jobId}/es`,
    );
  });

  test("derives the source language from a multi-language job", async () => {
    await putRecord({ targetlanguage: "es" });
    transcribeClientMock.on(GetTranscriptionJobCommand).resolves({
      TranscriptionJob: { LanguageCodes: [{ LanguageCode: "fr-FR" }] },
    });
    mockTranscript(s3ClientMock);
    translateClientMock
      .on(TranslateTextCommand)
      .resolves({ TranslatedText: "traducido" });

    await handler({ detail: { TranscriptionJobName: jobName } });

    expect(translateClientMock).toHaveReceivedCommandWith(
      TranslateTextCommand,
      {
        SourceLanguageCode: "fr",
        TargetLanguageCode: "es",
        Text: "Hello world.",
      },
    );
  });

  test("reads the redacted output key for PII-redacted jobs", async () => {
    await putRecord({ targetlanguage: "es", enablepiiredaction: "true" });
    transcribeClientMock.on(GetTranscriptionJobCommand).resolves({
      TranscriptionJob: {
        LanguageCode: "en-US",
        ContentRedaction: { RedactionType: "PII", RedactionOutput: "redacted" },
      },
    });
    mockTranscript(s3ClientMock);
    translateClientMock
      .on(TranslateTextCommand)
      .resolves({ TranslatedText: "translated" });

    await handler({ detail: { TranscriptionJobName: jobName } });

    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: `transcription/${identityId}/redacted-${jobId}.json`,
    });
  });

  test("does nothing when no target language is requested", async () => {
    await putRecord({ targetlanguage: "" });

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toEqual("No translation requested");
    expect(transcribeClientMock).not.toHaveReceivedCommand(
      GetTranscriptionJobCommand,
    );
    expect(translateClientMock).not.toHaveReceivedCommand(TranslateTextCommand);
    expect(s3ClientMock).not.toHaveReceivedCommand(PutObjectCommand);
  });

  test("copies the original transcript when source equals target", async () => {
    await putRecord({ targetlanguage: "en" });
    transcribeClientMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { LanguageCode: "en-US" } });
    mockTranscript(s3ClientMock);

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toContain("Source language matches target");
    expect(translateClientMock).not.toHaveReceivedCommand(TranslateTextCommand);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      Key: `users/${identityId}/translations/${jobId}/en`,
    });

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationKey).toEqual(
      `users/${identityId}/translations/${jobId}/en`,
    );
  });
});
