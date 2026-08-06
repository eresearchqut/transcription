import {
  CopyObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@smithy/util-stream";

import type { S3Event } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { Readable } from "node:stream";
import type { Transcription } from "model";

import { handler } from "../../src/event/copyOutputHandler";
import { getResource } from "../../src/repository/repository";

const identityId = "76c65a59-1c57-489b-be96-020ceaa9675a";
const jobId = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const bucket = "local-transcriptions";

const transcript = {
  results: {
    transcripts: [{ transcript: "Hello world." }],
    segments: [
      {
        start_time: "0.0",
        end_time: "612.5",
        alternatives: [{ transcript: "Hello world." }],
      },
    ],
  },
};

const event = (key: string) =>
  ({
    Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
  }) as S3Event;

describe("copyOutputHandler", () => {
  const s3ClientMock = mockClient(S3Client);

  beforeEach(() => {
    s3ClientMock.reset();
    s3ClientMock.on(CopyObjectCommand).resolves({});
    s3ClientMock.on(GetObjectCommand).resolves({
      Body: sdkStreamMixin(Readable.from(JSON.stringify(transcript))),
    } as never);
  });

  it("copies the output and records the audio duration", async () => {
    await handler(
      event(`transcription/${identityId}/${jobId}.json`),
      {} as never,
      {} as never,
    );

    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/transcription/${identityId}/${jobId}.json`,
      Key: `users/${identityId}/${jobId}.json`,
    });

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.downloadKey).toEqual(`users/${identityId}/${jobId}.json`);
    expect(record.audioSeconds).toEqual(612.5);
  });

  it("still records the download key when the duration cannot be measured", async () => {
    s3ClientMock.on(GetObjectCommand).rejects(new Error("AccessDenied"));

    await handler(
      event(`transcription/${identityId}/${jobId}.json`),
      {} as never,
      {} as never,
    );

    const record = (await getResource(identityId, jobId)) as Transcription;
    expect(record.downloadKey).toEqual(`users/${identityId}/${jobId}.json`);
    expect(record.audioSeconds).toBeUndefined();
  });

  it("ignores an unexpected key", async () => {
    await handler(event("somewhere/else.json"), {} as never, {} as never);

    expect(s3ClientMock).not.toHaveReceivedCommand(CopyObjectCommand);
  });
});
