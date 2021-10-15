const { handler } = require("../../src/event/fileUploadHandler");
const { mockClient } = require("aws-sdk-client-mock");
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");

const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");

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
