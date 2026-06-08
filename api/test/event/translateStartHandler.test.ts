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
  StartTextTranslationJobCommand,
  TranslateClient,
} from "@aws-sdk/client-translate";
import { marshall } from "@aws-sdk/util-dynamodb";
import { sdkStreamMixin } from "@smithy/util-stream";

import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Transcription } from "model";
import { Readable } from "stream";

import { handler } from "../../src/event/translateStartHandler";
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
        { start_time: "0.0", end_time: "4.0", speaker_label: "spk_0" },
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
    items: [],
  },
};

const putRecord = (metadata: Record<string, unknown>) =>
  dynamoDBClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall({ pk: identityId, sk: jobId, metadata }),
    }),
  );

describe("translateStartHandler", () => {
  const s3ClientMock = mockClient(S3Client);
  const transcribeClientMock = mockClient(TranscribeClient);
  const translateClientMock = mockClient(TranslateClient);

  beforeEach(() => {
    s3ClientMock.reset();
    transcribeClientMock.reset();
    translateClientMock.reset();
    s3ClientMock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(Readable.from(JSON.stringify(transcript))),
    } as never);
  });

  test("writes XLIFF and starts a batch translation job", async () => {
    await putRecord({ targetlanguage: "es" });
    transcribeClientMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { LanguageCode: "en-US" } });
    translateClientMock
      .on(StartTextTranslationJobCommand)
      .resolves({ JobId: "tjid", JobStatus: "SUBMITTED" });

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toContain("Started translation job tjid");
    // XLIFF written to the per-job input folder
    const put = s3ClientMock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(put.Key).toEqual(
      `translations/input/${identityId}/${jobId}/source.xlf`,
    );
    expect(put.ContentType).toEqual("application/x-xliff+xml");
    expect(put.Body).toContain(
      '<trans-unit id="0"><source>Hello world.</source>',
    );

    expect(translateClientMock).toHaveReceivedCommandWith(
      StartTextTranslationJobCommand,
      {
        JobName: jobName,
        SourceLanguageCode: "en",
        TargetLanguageCodes: ["es"],
        ClientToken: `${jobId}-es`,
        InputDataConfig: {
          S3Uri: `s3://${bucket}/translations/input/${identityId}/${jobId}/`,
          ContentType: "application/x-xliff+xml",
        },
        OutputDataConfig: {
          S3Uri: `s3://${bucket}/translations/output/${identityId}/${jobId}/`,
        },
      },
    );

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationJob).toEqual({
      jobId: "tjid",
      status: "SUBMITTED",
    });
  });

  test("copies the original transcript when source equals target", async () => {
    await putRecord({ targetlanguage: "en" });
    transcribeClientMock
      .on(GetTranscriptionJobCommand)
      .resolves({ TranscriptionJob: { LanguageCode: "en-US" } });

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toContain("Source language matches target");
    expect(translateClientMock).not.toHaveReceivedCommand(
      StartTextTranslationJobCommand,
    );
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      Key: `users/${identityId}/translations/${jobId}/en`,
    });
    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationKey).toEqual(
      `users/${identityId}/translations/${jobId}/en`,
    );
    expect(record.translationJob?.status).toEqual("COMPLETED");
  });

  test("does nothing when no target language is requested", async () => {
    await putRecord({ targetlanguage: "" });

    const result = await handler({ detail: { TranscriptionJobName: jobName } });

    expect(result).toEqual("No translation requested");
    expect(transcribeClientMock).not.toHaveReceivedCommand(
      GetTranscriptionJobCommand,
    );
    expect(translateClientMock).not.toHaveReceivedCommand(
      StartTextTranslationJobCommand,
    );
  });
});
