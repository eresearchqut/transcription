/**
 * Minimal shape of an Amazon Transcribe output document and helpers for turning
 * it into / rebuilding it from a translated transcript.
 */

export interface Segment {
  start_time: string;
  end_time: string;
  alternatives: { transcript: string }[];
}

export interface TranscriptResults {
  transcripts?: { transcript: string }[];
  segments?: Segment[];
  speaker_labels?: unknown;
  items?: unknown;
  audio_segments?: unknown;
  /** The language of a job that identified one language. */
  language_code?: string;
  /** The languages of a job that identified several. */
  language_codes?: { language_code: string; duration_in_seconds: number }[];
}

export interface TranscriptDocument {
  results: TranscriptResults;
  [key: string]: unknown;
}

/** The primary-alternative text of each segment, in order. */
export const segmentTexts = (doc: TranscriptDocument): string[] =>
  (doc.results.segments ?? []).map(
    (segment) => segment.alternatives?.[0]?.transcript ?? "",
  );

export const translationCharacterCount = (doc: TranscriptDocument): number =>
  segmentTexts(doc).reduce((total, text) => total + text.length, 0);

/**
 * The end time of the last timed entry. Transcribe's output does not record
 * the length of the media, so this stands in for it, less any trailing
 * silence.
 */
export const transcriptDurationSeconds = (
  doc: TranscriptDocument,
): number | undefined => {
  const timed = [
    doc.results.segments,
    doc.results.items,
    doc.results.audio_segments,
  ];
  let longest: number | undefined;
  for (const entries of timed) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      const endTime = Number((entry as { end_time?: string })?.end_time);
      if (
        Number.isFinite(endTime) &&
        (longest === undefined || endTime > longest)
      ) {
        longest = endTime;
      }
    }
  }
  return longest;
};

/**
 * The language Transcribe identified, which for a multi-language job is the
 * one spoken for longest. Undefined when the output names no language.
 */
export const transcriptLanguage = (
  doc: TranscriptDocument,
): string | undefined => {
  const { language_code: identified, language_codes: spoken } = doc.results;
  if (identified) {
    return identified;
  }
  if (!Array.isArray(spoken)) {
    return undefined;
  }
  let longest: (typeof spoken)[number] | undefined;
  for (const language of spoken) {
    if (
      !longest ||
      language.duration_in_seconds > longest.duration_in_seconds
    ) {
      longest = language;
    }
  }
  return longest?.language_code;
};

/**
 * Rebuild a Transcribe-shaped document with translated segment text, keyed by
 * segment index. Segment timings and speaker labels are preserved; the full
 * `transcripts` text is rebuilt from the translated segments; word-level `items`
 * are dropped (no per-word translation/timing exists).
 */
export const assembleTranslatedDocument = (
  doc: TranscriptDocument,
  targets: Map<number, string>,
): TranscriptDocument => {
  const segments = doc.results.segments ?? [];
  const translatedSegments = segments.map((segment, index) => ({
    ...segment,
    alternatives: [
      {
        transcript:
          targets.get(index) ?? segment.alternatives?.[0]?.transcript ?? "",
      },
    ],
  }));

  const fullTranscript = translatedSegments
    .map((segment) => segment.alternatives[0].transcript)
    .join(" ")
    .trim();

  const restResults = { ...doc.results };
  delete restResults.items;

  return {
    ...doc,
    results: {
      ...restResults,
      transcripts: [{ transcript: fullTranscript }],
      segments: translatedSegments,
    },
  };
};
