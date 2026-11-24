import {
  mapTranscriptionStatus,
  type Transcription,
  type UsageRecord,
  usagePartitionKey,
  usageSortKey,
} from "model";

const TERMINAL_STATUSES = ["COMPLETED", "FAILED"];

const parseBoolean = (value?: string): boolean => {
  try {
    return !!value && JSON.parse(value.toLowerCase()) === true;
  } catch {
    return false;
  }
};

const splitLanguages = (value?: string): string[] | undefined => {
  const languages = (value ?? "")
    .split(/,\s?/)
    .map((language) => language.trim())
    .filter(Boolean);
  return languages.length > 0 ? languages : undefined;
};

// The response stored at upload names a language only when the job was
// started with one. A language Transcribe identifies is read from its output.
const resolvedLanguage = (record: Transcription): string | undefined =>
  record.identifiedLanguage ??
  record.transcriptionResponse?.TranscriptionJob?.LanguageCode;

export const toUsageRecord = (record: Transcription): UsageRecord => {
  const metadata = record.metadata ?? ({} as Transcription["metadata"]);
  const status = mapTranscriptionStatus(record);
  const timestamp = record.date ?? new Date().toISOString();
  // Every update rewrites date, so it is the start only in the job's first
  // image, which the projection can miss.
  const startedAt = record.startedAt ?? timestamp;

  return {
    pk: usagePartitionKey(record.pk),
    sk: usageSortKey(record.sk),
    identityId: record.pk,
    jobId: record.sk,

    rpid: record.rpid,

    sourceLanguages: splitLanguages(metadata.languages),
    resolvedLanguage: resolvedLanguage(record),
    targetLanguage: metadata.targetlanguage || undefined,
    mimeType: metadata.mimetype || undefined,

    piiRedaction: parseBoolean(metadata.enablepiiredaction),
    summaryRequested: parseBoolean(metadata.generatesummary),
    translationRequested: !!metadata.targetlanguage,

    bytesUploaded: record.uploadEvent?.object?.size,
    audioSeconds: record.audioSeconds,
    summaryInputTokens: record.summaryUsage?.inputTokens,
    summaryOutputTokens: record.summaryUsage?.outputTokens,
    translationCharacters: record.translationCharacters,

    status,
    failureReason: record.jobStatusUpdated?.detail.FailureReason,
    translationStatus: record.translationJob?.status,
    translationFailureReason: record.translationJob?.message,

    usageMonth: startedAt.slice(0, 7),
    startedAt,
    updatedAt: timestamp,
    ...(status && TERMINAL_STATUSES.includes(status)
      ? { completedAt: timestamp }
      : {}),
  };
};
