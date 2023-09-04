import { handler } from "../../src/event/transcriptionJobStateChangeHandler";

describe("config", () => {
  it("start job after file upload", async () => {
    const jobStateChangeEvent = require("./jobStateChangeEvent.json");

    expect(await handler(jobStateChangeEvent)).toEqual(
      "Transcription job status updated",
    );
  });
});
