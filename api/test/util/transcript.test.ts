import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assembleTranslatedDocument,
  segmentTexts,
  type TranscriptDocument,
} from "../../src/util/transcript";

const fixture = (name: string): TranscriptDocument =>
  JSON.parse(
    readFileSync(
      join(__dirname, "..", "fixtures", "transcribe", `${name}.json`),
      "utf-8",
    ),
  );

/** Translate by marking, so a fallback to source text is visible in an assertion. */
const translateAll = (texts: string[]): Map<number, string> =>
  new Map(texts.map((text, index) => [index, `<${index}>${text}`]));

describe("transcript", () => {
  describe("segmentTexts", () => {
    test("returns the primary alternative of every segment, in order", () => {
      const document = fixture("single-language");
      const texts = segmentTexts(document);

      expect(texts).toHaveLength(document.results.segments?.length ?? 0);
      expect(texts.every((text) => text.length > 0)).toBe(true);
      expect(texts[0]).toEqual(
        document.results.segments?.[0].alternatives[0].transcript,
      );
    });

    test("returns an empty list for a document with no segments", () => {
      expect(segmentTexts({ results: {} })).toEqual([]);
    });
  });

  describe("assembleTranslatedDocument", () => {
    test("replaces segment text while preserving segment timings", () => {
      const document = fixture("single-language");
      const sources = segmentTexts(document);
      const translated = assembleTranslatedDocument(
        document,
        translateAll(sources),
      );

      const originalSegments = document.results.segments ?? [];
      const translatedSegments = translated.results.segments ?? [];

      expect(translatedSegments).toHaveLength(originalSegments.length);
      translatedSegments.forEach((segment, index) => {
        expect(segment.start_time).toEqual(originalSegments[index].start_time);
        expect(segment.end_time).toEqual(originalSegments[index].end_time);
        expect(segment.alternatives).toHaveLength(1);
        expect(segment.alternatives[0].transcript).toEqual(
          `<${index}>${sources[index]}`,
        );
      });
    });

    test("rebuilds the full transcript from the translated segments", () => {
      const document = fixture("single-language");
      const sources = segmentTexts(document);
      const translated = assembleTranslatedDocument(
        document,
        translateAll(sources),
      );

      expect(translated.results.transcripts).toHaveLength(1);
      expect(translated.results.transcripts?.[0].transcript).toEqual(
        sources.map((text, index) => `<${index}>${text}`).join(" "),
      );
    });

    test("falls back to the source text for a segment with no translation", () => {
      const document = fixture("single-language");
      const sources = segmentTexts(document);
      const partial = translateAll(sources);
      partial.delete(1);

      const segments =
        assembleTranslatedDocument(document, partial).results.segments ?? [];

      expect(segments[1].alternatives[0].transcript).toEqual(sources[1]);
      expect(segments[0].alternatives[0].transcript).toEqual(
        `<0>${sources[0]}`,
      );
    });

    test("drops word-level items, which have no translated counterpart", () => {
      const document = fixture("single-language");
      expect(document.results.items).toBeDefined();

      const translated = assembleTranslatedDocument(
        document,
        translateAll(segmentTexts(document)),
      );

      expect(translated.results.items).toBeUndefined();
    });

    test("leaves the start_time join to audio_segments intact", () => {
      // frontend/components/transcriptSegments.ts joins segments to
      // audio_segments by start_time. A translated document that changed those
      // times would silently attach the wrong speaker to a line.
      const document = fixture("multi-language");
      const translated = assembleTranslatedDocument(
        document,
        translateAll(segmentTexts(document)),
      );

      const audioStartTimes = new Set(
        (
          (translated.results.audio_segments ?? []) as { start_time: string }[]
        ).map((segment) => segment.start_time),
      );

      expect(audioStartTimes.size).toBeGreaterThan(0);
      for (const segment of translated.results.segments ?? []) {
        expect(audioStartTimes.has(segment.start_time)).toBe(true);
      }
    });

    test("preserves speaker labels so diarisation survives translation", () => {
      const document = fixture("single-language");
      const translated = assembleTranslatedDocument(
        document,
        translateAll(segmentTexts(document)),
      );

      expect(translated.results.speaker_labels).toEqual(
        document.results.speaker_labels,
      );
    });
  });
});
