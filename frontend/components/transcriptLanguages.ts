import { SUPPORTED_TRANSCRIPTION_LANGUAGES as supportedLanguages } from "model";

import { AudioSegment, Item, TranscriptJob } from "./transcriptDocument";

export interface LanguageSpan {
  startTime: number;
  endTime: number;
  languageCode: string;
}

const toSeconds = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

const spansFromAudioSegments = (segments: AudioSegment[]): LanguageSpan[] =>
  segments
    .filter((segment) => !!segment.language_code)
    .map((segment) => ({
      startTime: toSeconds(segment.start_time),
      endTime: toSeconds(segment.end_time),
      languageCode: segment.language_code as string,
    }));

const spansFromItems = (items: Item[]): LanguageSpan[] => {
  const spans: LanguageSpan[] = [];
  for (const item of items) {
    const languageCode = item.language_code;
    if (
      !languageCode ||
      item.start_time === undefined ||
      item.end_time === undefined
    ) {
      continue;
    }
    const previous = spans[spans.length - 1];
    if (previous && previous.languageCode === languageCode) {
      previous.endTime = toSeconds(item.end_time);
    } else {
      spans.push({
        startTime: toSeconds(item.start_time),
        endTime: toSeconds(item.end_time),
        languageCode,
      });
    }
  }
  return spans;
};

export const languageSpansFromTranscript = (
  job: TranscriptJob | undefined,
): LanguageSpan[] => {
  if (!job) return [];
  const fromSegments = spansFromAudioSegments(job.results.audio_segments ?? []);
  const spans =
    fromSegments.length > 0
      ? fromSegments
      : spansFromItems(job.results.items ?? []);
  return [...spans].sort((a, b) => a.startTime - b.startTime);
};

export const isMultilingual = (spans: LanguageSpan[]): boolean =>
  new Set(spans.map((span) => span.languageCode)).size > 1;

export const languageCodeAt = (
  spans: LanguageSpan[],
  time: number,
): string | undefined => {
  const containing = spans.find(
    (span) => time >= span.startTime && time <= span.endTime,
  );
  if (containing) return containing.languageCode;

  let preceding: LanguageSpan | undefined;
  for (const span of spans) {
    if (span.startTime <= time) {
      preceding = span;
    } else {
      break;
    }
  }
  return (preceding ?? spans[0])?.languageCode;
};

export const languageName = (code: string): string =>
  (supportedLanguages as Record<string, string>)[code] ?? code;
