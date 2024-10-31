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
  };
  date: string;
  downloadKey?: string;
  ttl: number;
  jobStatusUpdated?: {
    detail: {
      TranscriptionJobStatus: string;
      FailureReason?: string;
    };
  };
  transcriptionResponse?: {
    TranscriptionJob?: {
      TranscriptionJobStatus: string;
      ContentRedaction?: {
        RedactionType: string;
        RedactionOutput: string;
      };
      LanguageCode?: string;
      LanguageCodes?: [{ LanguageCode: string }];
    };
  };
  uploadEvent: {
    object: {
      size: number;
      key: string;
    };
  };
}

export const transcriptionJobStatus = (transcription: Transcription) =>
  (transcription.jobStatusUpdated?.detail.TranscriptionJobStatus ||
    transcription.transcriptionResponse?.TranscriptionJob
      ?.TranscriptionJobStatus) ??
  undefined;
