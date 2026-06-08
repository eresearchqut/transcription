import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DescribeTextTranslationJobCommand,
  TranslateClient,
} from "@aws-sdk/client-translate";
import { marshall } from "@aws-sdk/util-dynamodb";
import { sdkStreamMixin } from "@smithy/util-stream";

import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Transcription } from "model";
import { Readable } from "stream";

import { handler } from "../../src/event/translateJobStateChangeHandler";
import dynamoDBClient from "../../src/repository/dynamoDBClient";
import { getResource } from "../../src/repository/repository";

const tableName = process.env.TABLE_NAME || "transcription";
const bucket = process.env.BUCKET_NAME || "transcriptions";

const identityId = "76c65a59-1c57-489b-be96-020ceaa9675a";
const jobId = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const jobName = `${identityId}_${jobId}`;
const translateJobId = "tjid";
const outputPrefix = `translations/output/${identityId}/${jobId}/123-TranslateText-${translateJobId}/`;

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
    items: [{ start_time: "0.0", end_time: "0.5" }],
  },
};

const translatedXliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2"><file source-language="en" target-language="es"><body>
  <trans-unit id="0"><source>Hello world.</source><target>Hola mundo.</target></trans-unit>
  <trans-unit id="1"><source>How are you?</source><target>¿Cómo estás?</target></trans-unit>
</body></file></xliff>`;

const stream = (body: string) =>
  ({ Body: sdkStreamMixin(Readable.from(body)) }) as never;

const putRecord = (metadata: Record<string, unknown>) =>
  dynamoDBClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall({ pk: identityId, sk: jobId, metadata }),
    }),
  );

describe("translateJobStateChangeHandler", () => {
  const s3ClientMock = mockClient(S3Client);
  const translateClientMock = mockClient(TranslateClient);

  beforeEach(() => {
    s3ClientMock.reset();
    translateClientMock.reset();
  });

  test("assembles a translated transcript on COMPLETED", async () => {
    await putRecord({ targetlanguage: "es" });
    translateClientMock.on(DescribeTextTranslationJobCommand).resolves({
      TextTranslationJobProperties: {
        JobName: jobName,
        JobStatus: "COMPLETED",
        TargetLanguageCodes: ["es"],
        OutputDataConfig: { S3Uri: `s3://${bucket}/${outputPrefix}` },
      },
    });
    s3ClientMock
      .on(GetObjectCommand, { Key: `${outputPrefix}es.source.xlf` })
      .resolves(stream(translatedXliff));
    s3ClientMock
      .on(GetObjectCommand, {
        Key: `transcription/${identityId}/${jobId}.json`,
      })
      .resolves(stream(JSON.stringify(transcript)));

    const result = await handler({
      detail: { jobId: translateJobId, jobStatus: "COMPLETED" },
    });

    expect(result).toContain("Translated transcript written");
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      Key: `users/${identityId}/translations/${jobId}/es`,
    });

    const put = s3ClientMock
      .commandCalls(PutObjectCommand)
      .find(
        (c) =>
          c.args[0].input.Key ===
          `users/${identityId}/translations/${jobId}/es`,
      )!;
    const written = JSON.parse(put.args[0].input.Body as string);
    expect(written.results.segments[0].alternatives[0].transcript).toEqual(
      "Hola mundo.",
    );
    expect(written.results.segments[1].alternatives[0].transcript).toEqual(
      "¿Cómo estás?",
    );
    expect(written.results.segments[0].start_time).toEqual("0.0");
    expect(written.results.transcripts[0].transcript).toEqual(
      "Hola mundo. ¿Cómo estás?",
    );
    expect(written.results.speaker_labels).toEqual(
      transcript.results.speaker_labels,
    );
    expect(written.results.items).toBeUndefined();

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationKey).toEqual(
      `users/${identityId}/translations/${jobId}/es`,
    );
    expect(record.translationJob?.status).toEqual("COMPLETED");
  });

  test("reads the redacted transcript key for PII-redacted jobs", async () => {
    await putRecord({ targetlanguage: "es", enablepiiredaction: "true" });
    translateClientMock.on(DescribeTextTranslationJobCommand).resolves({
      TextTranslationJobProperties: {
        JobName: jobName,
        JobStatus: "COMPLETED",
        TargetLanguageCodes: ["es"],
        OutputDataConfig: { S3Uri: `s3://${bucket}/${outputPrefix}` },
      },
    });
    s3ClientMock
      .on(GetObjectCommand, { Key: `${outputPrefix}es.source.xlf` })
      .resolves(stream(translatedXliff));
    s3ClientMock
      .on(GetObjectCommand, {
        Key: `transcription/${identityId}/redacted-${jobId}.json`,
      })
      .resolves(stream(JSON.stringify(transcript)));

    await handler({
      detail: { jobId: translateJobId, jobStatus: "COMPLETED" },
    });

    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: `transcription/${identityId}/redacted-${jobId}.json`,
    });
  });

  test("records failure without writing an artifact when the job fails", async () => {
    await putRecord({ targetlanguage: "es" });
    translateClientMock.on(DescribeTextTranslationJobCommand).resolves({
      TextTranslationJobProperties: {
        JobName: jobName,
        JobStatus: "FAILED",
        Message: "boom",
      },
    });

    const result = await handler({
      detail: { jobId: translateJobId, jobStatus: "FAILED" },
    });

    expect(result).toContain("FAILED");
    expect(s3ClientMock).not.toHaveReceivedCommand(PutObjectCommand);
    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.translationJob?.status).toEqual("FAILED");
    expect(record.translationJob?.message).toEqual("boom");
  });
});
