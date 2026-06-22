export enum TranscriptionJobStatus {
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
}

export interface Transcription {
  pk: string;
  sk: string;
  metadata: {
    filetype: string;
    languagecode: string;
    mimetype: string;
    filename: string;
    generatesummary: string;
    enablepiiredaction: string;
    targetlanguage?: string;
  };
  date: string;
  downloadKey?: string;
  summaryKey?: string;
  translationKey?: string;
  translationJob?: {
    jobId: string;
    status: string;
    message?: string;
  };
  ttl: number;
  jobStatusUpdated?: {
    detail: {
      TranscriptionJobStatus: string;
      FailureReason?: string;
    };
  };
  transcriptionResponse?: {
    TranscriptionJob?: {
      TranscriptionJobStatus: TranscriptionJobStatus;
      ContentRedaction?: {
        RedactionType: string;
        RedactionOutput: string;
      };
      LanguageCode?: string;
      LanguageCodes?: [{ LanguageCode: string }];
      LanguageOptions: string[];
    };
  };
  uploadEvent: {
    object: {
      size: number;
      key: string;
    };
  };
}

export const mapTranscriptionStatus = (
  transcription: Transcription | undefined,
) =>
  ((transcription?.jobStatusUpdated?.detail.TranscriptionJobStatus ||
    transcription?.transcriptionResponse?.TranscriptionJob
      ?.TranscriptionJobStatus) as TranscriptionJobStatus) ?? undefined;

export const enableGenerateSummary = (transcription: Transcription): boolean =>
  transcription.metadata.generatesummary &&
  JSON.parse(transcription.metadata.generatesummary);

export const enableTranslation = (transcription: Transcription): boolean =>
  !!transcription.metadata.targetlanguage &&
  transcription.metadata.targetlanguage.length > 0;

import supportedTranslationLanguagesJson from "./supported_translation_languages.json";
import supportedTranscriptionLanguagesJson from "./supported_transcription_languages.json";

/**
 * All Amazon Translate source language codes, keyed by language code with the
 * human-readable name as the value. This is the single source of truth for
 * which languages are supported as translation targets (and sources).
 */
export const SUPPORTED_TRANSLATION_LANGUAGES: Record<string, string> =
  supportedTranslationLanguagesJson;

/**
 * All Amazon Transcribe locale codes, keyed by locale with the human-readable
 * name as the value.
 */
export const SUPPORTED_TRANSCRIPTION_LANGUAGES: Record<string, string> =
  supportedTranscriptionLanguagesJson;

/**
 * Amazon Transcribe locales (e.g. "en-US") map onto Amazon Translate source
 * language codes, which are mostly the 2-letter ISO prefix but with a handful
 * of region-specific exceptions. Anything not listed falls back to the locale's
 * 2-letter prefix.
 */
const TRANSCRIBE_TO_TRANSLATE_SOURCE: Record<string, string> = {
  "zh-CN": "zh",
  "zh-TW": "zh-TW",
  "pt-BR": "pt",
  "pt-PT": "pt-PT",
  "fr-CA": "fr-CA",
  "es-MX": "es-MX",
};

const TRANSLATE_SUPPORTED_SOURCE_CODES: ReadonlySet<string> = new Set(
  Object.keys(SUPPORTED_TRANSLATION_LANGUAGES),
);

/**
 * Returns the Amazon Translate source language code for a Transcribe locale,
 * or undefined if the locale maps to a language Translate does not support.
 */
export const toTranslateSourceCode = (
  transcribeLocale: string,
): string | undefined => {
  const code =
    TRANSCRIBE_TO_TRANSLATE_SOURCE[transcribeLocale] ??
    transcribeLocale.split("-")[0];
  return TRANSLATE_SUPPORTED_SOURCE_CODES.has(code) ? code : undefined;
};

export const translationStatus = (
  transcription: Transcription,
): string | undefined => transcription.translationJob?.status;

/**
 * Terminal Amazon Translate batch job states that mean no translation artifact
 * will be produced.
 */
const FAILED_TRANSLATION_STATUSES = [
  "FAILED",
  "STOPPED",
  "COMPLETED_WITH_ERROR",
];

export const isTranslationFailed = (transcription: Transcription): boolean => {
  const status = translationStatus(transcription);
  return !!status && FAILED_TRANSLATION_STATUSES.includes(status);
};
