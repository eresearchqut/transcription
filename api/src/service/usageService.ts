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

const resolvedLanguage = (record: Transcription): string | undefined => {
  const job = record.transcriptionResponse?.TranscriptionJob;
  return job?.LanguageCode ?? job?.LanguageCodes?.[0]?.LanguageCode;
};

export const toUsageRecord = (record: Transcription): UsageRecord => {
  const metadata = record.metadata ?? ({} as Transcription["metadata"]);
  const status = mapTranscriptionStatus(record);
  const timestamp = record.date ?? new Date().toISOString();

  return {
    pk: usagePartitionKey(record.pk),
    sk: usageSortKey(record.sk),
    identityId: record.pk,
    jobId: record.sk,

    rpid: metadata.rpid || undefined,
    rpidPayload: record.rpidPayload,

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

    usageMonth: timestamp.slice(0, 7),
    startedAt: timestamp,
    updatedAt: timestamp,
    ...(status && TERMINAL_STATUSES.includes(status)
      ? { completedAt: timestamp }
      : {}),
  };
};
