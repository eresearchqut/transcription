import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { marshall } from "@aws-sdk/util-dynamodb";
import { sdkStreamMixin, Uint8ArrayBlobAdapter } from "@smithy/util-stream";

import type { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Readable } from "node:stream";
import type { Transcription } from "model";

import { handler } from "../../src/event/summariseTranscriptionHandler";
import dynamoDBClient from "../../src/repository/dynamoDBClient";
import { getResource } from "../../src/repository/repository";

const tableName = process.env.TABLE_NAME || "transcription";

describe("summariseTranscriptionHandler", () => {
  const s3ClientMock = mockClient(S3Client);
  const bedrockClientMock = mockClient(BedrockRuntimeClient);

  beforeEach(() => {
    s3ClientMock.reset();
    bedrockClientMock.reset();
  });

  const textContent = [
    { type: "text", text: "dummy output transcription summary" },
  ];

  test.each([
    {
      name: "generate summary",
      metadata: { generatesummary: "true" },
      content: textContent,
      transcriptionKey: "2e9b38b5-1df0-4841-8308-f174fb88aac7.json",
      s3Key: `users/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedGetKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedPutKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
      expectedSummaryKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
    },
    {
      name: "generate summary with pii redaction",
      metadata: { generatesummary: "true", enablepiiredaction: "true" },
      content: textContent,
      transcriptionKey: "redacted-2e9b38b5-1df0-4841-8308-f174fb88aac7.json",
      s3Key: `users/76c65a59-1c57-489b-be96-020ceaa9675a/redacted-2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedGetKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/redacted-2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedPutKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
      expectedSummaryKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
    },
    {
      name: "generate summary when the model thinks first",
      metadata: { generatesummary: "true" },
      content: [
        { type: "thinking", thinking: "", signature: "signature" },
        ...textContent,
      ],
      transcriptionKey: "2e9b38b5-1df0-4841-8308-f174fb88aac7.json",
      s3Key: `users/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedGetKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json`,
      expectedPutKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
      expectedSummaryKey: `users/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7`,
    },
  ])("test $name", async ({
    metadata,
    content,
    s3Key,
    expectedGetKey,
    expectedPutKey,
    expectedSummaryKey,
  }) => {
    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          pk: "76c65a59-1c57-489b-be96-020ceaa9675a",
          sk: "2e9b38b5-1df0-4841-8308-f174fb88aac7",
          metadata: JSON.parse(JSON.stringify(metadata)),
        }),
      }),
    );

    s3ClientMock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(
        Readable.from(
          JSON.stringify({
            results: {
              transcripts: [{ transcript: "dummy transcription from mock" }],
            },
          }),
        ),
      ),
    });
    bedrockClientMock.on(InvokeModelCommand).resolves({
      body: new Uint8ArrayBlobAdapter(
        Buffer.from(JSON.stringify({ content, stop_reason: "end_turn" })),
      ),
    });

    expect(
      await handler({
        Records: [
          {
            s3: {
              bucket: { name: "local-transcriptions" },
              object: {
                key: s3Key,
              },
            },
          },
        ],
      } as S3Event),
    ).toEqual("Processed 1 uploads, generated 1 summaries.");

    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: "local-transcriptions",
      Key: expectedGetKey,
    });

    expect(bedrockClientMock).toHaveReceivedCommandWith(InvokeModelCommand, {
      contentType: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 32000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Summarise the following transcript in a single paragraph, under 100 words " +
                  "relying strictly on the text provided. " +
                  "<transcript>dummy transcription from mock</transcript> " +
                  "Skip the preamble and go straight into the summary.",
              },
            ],
          },
        ],
      }),
      modelId: "au.anthropic.claude-haiku-5-5",
    });

    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: "local-transcriptions",
      Key: expectedPutKey,
      Body: "dummy output transcription summary",
    });

    const transcription = (await getResource(
      "76c65a59-1c57-489b-be96-020ceaa9675a",
      "2e9b38b5-1df0-4841-8308-f174fb88aac7",
    )) as Transcription;
    expect(transcription.summaryKey).toEqual(expectedSummaryKey);
  });

  test("does not store a summary when the model returns no text", async () => {
    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          pk: "76c65a59-1c57-489b-be96-020ceaa9675a",
          sk: "0d6f1a3e-7c4b-4e5a-9f2d-8b1c3a5e7f90",
          metadata: { generatesummary: "true" },
        }),
      }),
    );
    s3ClientMock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(
        Readable.from(
          JSON.stringify({
            results: {
              transcripts: [{ transcript: "dummy transcription from mock" }],
            },
          }),
        ),
      ),
    });
    bedrockClientMock.on(InvokeModelCommand).resolves({
      body: new Uint8ArrayBlobAdapter(
        Buffer.from(
          JSON.stringify({
            content: [{ type: "thinking", thinking: "", signature: "sig" }],
            stop_reason: "max_tokens",
          }),
        ),
      ),
    });

    await expect(
      handler({
        Records: [
          {
            s3: {
              bucket: { name: "local-transcriptions" },
              object: {
                key: "users/76c65a59-1c57-489b-be96-020ceaa9675a/0d6f1a3e-7c4b-4e5a-9f2d-8b1c3a5e7f90.json",
              },
            },
          },
        ],
      } as S3Event),
    ).rejects.toThrow("Model returned no text (stop_reason: max_tokens)");

    expect(s3ClientMock).not.toHaveReceivedCommand(PutObjectCommand);
    const transcription = (await getResource(
      "76c65a59-1c57-489b-be96-020ceaa9675a",
      "0d6f1a3e-7c4b-4e5a-9f2d-8b1c3a5e7f90",
    )) as Transcription;
    expect(transcription.summaryKey).toBeUndefined();
  });
});
