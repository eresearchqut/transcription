import type { TranscriptionJob } from "@aws-sdk/client-transcribe";

import { handler } from "../../src/event/transcriptionJobStateChangeHandler";
import jobStateChangeEvent from "./jobStateChangeEvent.json";

describe("config", () => {
  it("start job after file upload", async () => {
    expect(
      await handler(jobStateChangeEvent as { detail?: TranscriptionJob }),
    ).toEqual("Transcription job status updated");
  });
});
