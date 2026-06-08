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

export const toTranslateSourceCode = (transcribeLocale: string): string =>
  TRANSCRIBE_TO_TRANSLATE_SOURCE[transcribeLocale] ??
  transcribeLocale.split("-")[0];
