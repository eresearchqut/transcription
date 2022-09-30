import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import { mockClient } from "aws-sdk-client-mock";

import { handler } from "../../src/event/fileUploadHandler";

describe("config", () => {
  it("start job after file upload", async () => {
    const transcribeMock = mockClient(TranscribeClient);
    const s3Mock = mockClient(S3Client);
    const fileUploadEvent = require("./fileUplopadEvent.json");
    const fileMetadata = require("./fileMetadata.json");

    s3Mock.on(HeadObjectCommand).resolves(fileMetadata);

    transcribeMock.on(StartTranscriptionJobCommand).resolves({
      TranscriptionJob: {
        TranscriptionJobName: "A-Job",
      },
    });
    expect(await handler(fileUploadEvent)).toEqual("Processed 1 uploads");
  });
});
