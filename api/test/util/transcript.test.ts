import {
  transcriptDurationSeconds,
  translationCharacterCount,
} from "../../src/util/transcript";

describe("transcript", () => {
  it("measures duration from the last thing Transcribe heard", () => {
    expect(
      transcriptDurationSeconds({
        results: {
          segments: [
            {
              start_time: "0.0",
              end_time: "2.0",
              alternatives: [{ transcript: "Hello world." }],
            },
            {
              start_time: "2.0",
              end_time: "612.5",
              alternatives: [{ transcript: "How are you?" }],
            },
          ],
        },
      }),
    ).toEqual(612.5);
  });

  it("falls back to word-level items when there are no segments", () => {
    expect(
      transcriptDurationSeconds({
        results: {
          items: [
            { start_time: "0.0", end_time: "1.5" },
            { start_time: "1.5", end_time: "3.25" },
            { type: "punctuation" },
          ],
        },
      }),
    ).toEqual(3.25);
  });

  it("returns undefined for a transcript with no timings", () => {
    expect(
      transcriptDurationSeconds({
        results: { transcripts: [{ transcript: "Hello world." }] },
      }),
    ).toBeUndefined();
  });

  it("counts billable translation characters", () => {
    expect(
      translationCharacterCount({
        results: {
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
        },
      }),
    ).toEqual(24);
  });
});
