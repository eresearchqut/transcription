import type {
  Alternative,
  SpeakerSegment,
  TranscriptJob,
} from "./transcriptDocument";

/**
 * A single normalized transcript segment shared by every download/render path
 * (SRT, VTT, TXT, DOCX, player cues, language/speaker lists).
 *
 * Amazon Transcribe originals expose two parallel, index-aligned views of the
 * same segments: `segments` (word-level `alternatives`) and `audio_segments`
 * (which carry `language_code` and `speaker_label`). We join them once here
 * into a single enriched list rather than re-deriving them in each generator.
 * Translations expose only `segments` (single alternative, no language/speaker),
 * which fall through with those fields undefined.
 */
export interface NormalizedSegment {
  start_time: string;
  end_time: string;
  alternatives: Alternative[];
  language_code?: string;
  speaker_label?: string;
}

const speakers: Record<string, string> = {
  spk_0: "Speaker 1",
  spk_1: "Speaker 2",
  spk_2: "Speaker 3",
  spk_3: "Speaker 4",
  spk_4: "Speaker 5",
  spk_5: "Speaker 6",
  spk_6: "Speaker 7",
  spk_7: "Speaker 8",
  spk_8: "Speaker 9",
  spk_9: "Speaker 10",
};

/**
 * Normalise a transcript job to a flat list of enriched segments, computed
 * once. Original transcripts keep the richer `alternatives` from `segments`
 * enriched with the language/speaker from the parallel `audio_segments`;
 * translations (only `segments`) leave those fields undefined.
 */
export const normalizedSegments = (job: TranscriptJob): NormalizedSegment[] => {
  const audioSegments = job.results.audio_segments ?? [];
  const segments = job.results.segments ?? [];

  if (segments.length) {
    // Index audio segments by start_time once so enrichment stays O(n) rather
    // than a nested `find` per segment (O(n²)), which slows downloads for long
    // transcripts.
    const audioByStartTime = new Map(
      audioSegments.map((segment) => [segment.start_time, segment]),
    );
    return segments.map((segment, index) => {
      const audio =
        audioByStartTime.get(segment.start_time) ?? audioSegments[index];
      return {
        start_time: segment.start_time,
        end_time: segment.end_time,
        alternatives: segment.alternatives,
        language_code: audio?.language_code,
        speaker_label: audio?.speaker_label,
      };
    });
  }

  return audioSegments.map((segment) => ({
    start_time: segment.start_time,
    end_time: segment.end_time,
    alternatives: [{ transcript: segment.transcript }],
    language_code: segment.language_code,
    speaker_label: segment.speaker_label,
  }));
};

/** The primary (best) transcript for a segment. */
export const segmentTranscript = (segment: NormalizedSegment): string =>
  segment.alternatives[0]?.transcript ?? "";

/** Whether any segment carries an identified language code. */
export const hasLanguageCodes = (
  segments: { language_code?: string }[],
): boolean => segments.some((segment) => !!segment.language_code);

/**
 * Resolve the display speaker for a segment: its own `speaker_label` when
 * present, otherwise the speaker whose diarisation segment starts within the
 * segment's time range. Returns "" when no speaker can be identified.
 */
export const resolveSpeaker = (
  segment: Pick<NormalizedSegment, "start_time" | "end_time" | "speaker_label">,
  speakerSegments: SpeakerSegment[] | undefined,
): string => {
  const label =
    segment.speaker_label ??
    speakerSegments?.find(
      ({ start_time: speakerStartTime }) =>
        parseFloat(speakerStartTime) <= parseFloat(segment.end_time) &&
        parseFloat(speakerStartTime) >= parseFloat(segment.start_time),
    )?.speaker_label;
  if (!label) return "";
  return speakers[label] ?? label;
};
