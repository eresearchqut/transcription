import type { SpeakerSegment, TranscriptJob } from "./transcriptDocument";

/**
 * Builders that produce subtitle/text output from a transcript at the SEGMENT
 * level. Amazon Transcribe groups words into `audio_segments`, each with a
 * `transcript`, `start_time` and `end_time`. Translations are stored
 * Transcribe-shaped with translated `segments` (no word-level `items`).
 * Building captions from these segments keeps lines aligned to natural pauses,
 * which the word-based `aws-transcription-to-srt` could not do.
 */

export interface SubtitleSegment {
  start_time: string;
  end_time: string;
  transcript: string;
  speaker_label?: string;
  language_code?: string;
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

const pad = (value: number, length: number) =>
  value.toString().padStart(length, "0");

/** Format seconds as an SRT timestamp: HH:MM:SS,mmm */
const formatSrtTime = (time: string): string => {
  const totalSeconds = Math.max(0, Number.parseFloat(time) || 0);
  const totalMs = Math.round(totalSeconds * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
};

const speakerLabel = (
  segments: SpeakerSegment[] | undefined,
  startTime: string,
  endTime: string,
  ownLabel?: string,
): string => {
  const label =
    ownLabel ??
    segments?.find(
      ({ start_time: speakerStartTime }) =>
        parseFloat(speakerStartTime) <= parseFloat(endTime) &&
        parseFloat(speakerStartTime) >= parseFloat(startTime),
    )?.speaker_label;
  if (!label) return "";
  return speakers[label] ?? label;
};

/** Whether any segment carries an identified language code. */
const hasLanguageCodes = (segments: SubtitleSegment[]): boolean =>
  segments.some((segment) => !!segment.language_code);

/**
 * Prefix a transcript line with an optional language tag and speaker label,
 * e.g. `[EN] Speaker 1: ...`. Empty parts are omitted.
 */
const formatSegmentLine = (
  transcript: string,
  speaker: string,
  languageCode: string | undefined,
): string => {
  const prefix = [
    languageCode ? `[${languageCode.toUpperCase()}]` : "",
    speaker ? `${speaker}:` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return prefix ? `${prefix} ${transcript}` : transcript;
};

export interface SubtitleOptions {
  includeSpeakers?: boolean;
  includeLanguages?: boolean;
}

/**
 * Normalise a transcript to a flat list of timed segments. Original transcripts
 * expose `audio_segments`; translations expose `segments` (single alternative).
 */
export const subtitleSegments = (job: TranscriptJob): SubtitleSegment[] => {
  const audioSegments = job.results.audio_segments;
  if (audioSegments && audioSegments.length > 0) {
    return audioSegments
      .filter((segment) => segment.transcript.trim().length > 0)
      .map((segment) => ({
        start_time: segment.start_time,
        end_time: segment.end_time,
        transcript: segment.transcript,
        speaker_label: segment.speaker_label,
        language_code: segment.language_code,
      }));
  }
  return (job.results.segments ?? [])
    .map((segment) => ({
      start_time: segment.start_time,
      end_time: segment.end_time,
      transcript: segment.alternatives[0]?.transcript ?? "",
    }))
    .filter((segment) => segment.transcript.trim().length > 0);
};

export const segmentsToSrt = (
  job: TranscriptJob,
  { includeSpeakers = false, includeLanguages = false }: SubtitleOptions = {},
): string => {
  const segments = subtitleSegments(job);
  const showLanguages = includeLanguages && hasLanguageCodes(segments);
  return segments
    .map((segment, index) => {
      const speaker = includeSpeakers
        ? speakerLabel(
            job.results.speaker_labels?.segments,
            segment.start_time,
            segment.end_time,
            segment.speaker_label,
          )
        : "";
      const line = formatSegmentLine(
        segment.transcript,
        speaker,
        showLanguages ? segment.language_code : undefined,
      );
      return [
        index + 1,
        `${formatSrtTime(segment.start_time)} --> ${formatSrtTime(segment.end_time)}`,
        line,
      ].join("\n");
    })
    .join("\n\n");
};

export const segmentsToText = (
  job: TranscriptJob,
  { includeSpeakers = false, includeLanguages = false }: SubtitleOptions = {},
): string => {
  const segments = subtitleSegments(job);
  const showLanguages = includeLanguages && hasLanguageCodes(segments);
  return segments
    .map((segment) => {
      const speaker = includeSpeakers
        ? speakerLabel(
            job.results.speaker_labels?.segments,
            segment.start_time,
            segment.end_time,
            segment.speaker_label,
          )
        : "";
      return formatSegmentLine(
        segment.transcript,
        speaker,
        showLanguages ? segment.language_code : undefined,
      );
    })
    .join("\n\n");
};

/** Display speaker label for each subtitle segment, in cue order. */
export const speakerLabels = (job: TranscriptJob): string[] =>
  subtitleSegments(job).map((segment) =>
    speakerLabel(
      job.results.speaker_labels?.segments,
      segment.start_time,
      segment.end_time,
      segment.speaker_label,
    ),
  );
