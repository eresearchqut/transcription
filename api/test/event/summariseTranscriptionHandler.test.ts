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

import { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Transcription } from "model";
import { Readable } from "stream";

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

  test("handler", async () => {
    await dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshall({
          pk: "76c65a59-1c57-489b-be96-020ceaa9675a",
          sk: "2e9b38b5-1df0-4841-8308-f174fb88aac7",
          metadata: JSON.parse(JSON.stringify({ generatesummary: "true" })),
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
            content: [{ text: "dummy output transcription summary" }],
          }),
        ),
      ),
    });

    expect(
      await handler({
        Records: [
          {
            s3: {
              bucket: { name: "local-transcriptions" },
              object: {
                key: "private/ap-southeast-2%3Abcb38797-8e6a-43ea-9844-d8505927785a/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json",
              },
            },
          },
        ],
      } as S3Event),
    ).toEqual("Processed 1 uploads, generated 1 summaries.");

    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: "local-transcriptions",
      Key: "private/ap-southeast-2:bcb38797-8e6a-43ea-9844-d8505927785a/76c65a59-1c57-489b-be96-020ceaa9675a/2e9b38b5-1df0-4841-8308-f174fb88aac7.json",
    });

    expect(bedrockClientMock).toHaveReceivedCommandWith(InvokeModelCommand, {
      contentType: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
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
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    });

    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: "local-transcriptions",
      Key: "private/ap-southeast-2:bcb38797-8e6a-43ea-9844-d8505927785a/76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7",
      Body: "dummy output transcription summary",
    });

    const transcription = (await getResource(
      "76c65a59-1c57-489b-be96-020ceaa9675a",
      "2e9b38b5-1df0-4841-8308-f174fb88aac7",
    )) as Transcription;
    expect(transcription.summaryKey).toEqual(
      "76c65a59-1c57-489b-be96-020ceaa9675a/summary/2e9b38b5-1df0-4841-8308-f174fb88aac7",
    );
  });
});
