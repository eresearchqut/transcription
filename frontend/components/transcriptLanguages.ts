import { SUPPORTED_TRANSCRIPTION_LANGUAGES as supportedLanguages } from "model";

import { subtitleSegments } from "./segmentSubtitles";
import type { TranscriptJob } from "./transcriptDocument";

/**
 * Language code for each subtitle segment, in cue order. The player renders one
 * cue per segment, so the array is indexed by cue position rather than looked
 * up by time. `undefined` marks segments without an identified language.
 */
export const languageCodesFromTranscript = (
  job: TranscriptJob | undefined,
): (string | undefined)[] =>
  job ? subtitleSegments(job).map((segment) => segment.language_code) : [];

export const isMultilingual = (codes: (string | undefined)[]): boolean =>
  new Set(codes.filter((code): code is string => !!code)).size > 1;

export const languageName = (code: string): string =>
  (supportedLanguages as Record<string, string>)[code] ?? code;
