const { handler } = require("../../src/event/fileUploadHandler");
const { mockClient } = require("aws-sdk-client-mock");
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");

describe("config", () => {
  it("start job after file upload", async () => {
    const transcribeMock = mockClient(TranscribeClient);
    const fileUploadEvent = require("./fileUplopadEvent.json");
    transcribeMock.on(StartTranscriptionJobCommand).resolves({
      TranscriptionJob: {
        TranscriptionJobName: "A-Job",
      },
    });
    expect(await handler(fileUploadEvent)).toEqual("Processed 1 uploads");
  });
});
