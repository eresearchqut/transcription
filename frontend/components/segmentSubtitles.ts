import { SpeakerSegment, TranscriptJob } from "./transcriptDocument";

/**
 * Builders that produce subtitle/text output from a translated transcript at the
 * SEGMENT level. Amazon Translate produces no word-level (`results.items`)
 * alignment, so the word-based `aws-transcription-to-srt` cannot be used for
 * translations. These builders use each segment's original start/end times so
 * the translated captions stay roughly in sync with the media.
 */

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
): string => {
  const label = segments?.find(
    ({ start_time: speakerStartTime }) =>
      parseFloat(speakerStartTime) <= parseFloat(endTime) &&
      parseFloat(speakerStartTime) >= parseFloat(startTime),
  )?.speaker_label;
  if (!label) return "";
  return speakers[label] ?? label;
};

export const segmentsToSrt = (
  job: TranscriptJob,
  { includeSpeakers = true }: { includeSpeakers?: boolean } = {},
): string =>
  job.results.segments
    .map((segment, index) => {
      const speaker = includeSpeakers
        ? speakerLabel(
            job.results.speaker_labels?.segments,
            segment.start_time,
            segment.end_time,
          )
        : "";
      const transcript = segment.alternatives[0]?.transcript ?? "";
      const line = speaker ? `${speaker}: ${transcript}` : transcript;
      return [
        index + 1,
        `${formatSrtTime(segment.start_time)} --> ${formatSrtTime(segment.end_time)}`,
        line,
      ].join("\n");
    })
    .join("\n\n");

export const segmentsToText = (job: TranscriptJob): string =>
  job.results.segments
    .map((segment) => {
      const speaker = speakerLabel(
        job.results.speaker_labels?.segments,
        segment.start_time,
        segment.end_time,
      );
      const transcript = segment.alternatives[0]?.transcript ?? "";
      return speaker ? `${speaker}: ${transcript}` : transcript;
    })
    .join("\n\n");
