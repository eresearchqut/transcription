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
  };
  date: string;
  downloadKey?: string;
  summaryKey?: string;
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
