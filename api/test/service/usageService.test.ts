import type { Transcription } from "model";
import { TranscriptionJobStatus } from "model";

import { toUsageRecord } from "../../src/service/usageService";

const IDENTITY_ID = "76c65a59-1c57-489b-be96-020ceaa9675a";
const JOB_ID = "2e9b38b5-1df0-4841-8308-f174fb88aac7";

const transcription = (overrides: Partial<Transcription> = {}) =>
  ({
    pk: IDENTITY_ID,
    sk: JOB_ID,
    date: "2026-08-06T01:02:03.000Z",
    metadata: {
      filename: "Confidential%20interview.wav",
      filetype: "userUploadedFile",
      mimetype: "audio/wav",
      languages: "en-AU,fr-FR",
      enablepiiredaction: "false",
      generatesummary: "true",
      targetlanguage: "es",
      rpid: "RPID-1234",
    },
    uploadEvent: { object: { key: "users/x/y.upload", size: 1292288 } },
    ...overrides,
  }) as unknown as Transcription;

describe("usageService", () => {
  it("maps the metered units and dimensions of a job", () => {
    const record = toUsageRecord(
      transcription({
        rpidPayload: { encodedId: "RPID-1234", organisation: "Faculty of X" },
        audioSeconds: 128.4,
        summaryUsage: { inputTokens: 900, outputTokens: 120 },
        translationCharacters: 4321,
      }),
    );

    expect(record).toEqual(
      expect.objectContaining({
        pk: `USER#${IDENTITY_ID}`,
        sk: `JOB#${JOB_ID}`,
        identityId: IDENTITY_ID,
        jobId: JOB_ID,
        rpid: "RPID-1234",
        rpidPayload: { encodedId: "RPID-1234", organisation: "Faculty of X" },
        sourceLanguages: ["en-AU", "fr-FR"],
        targetLanguage: "es",
        mimeType: "audio/wav",
        piiRedaction: false,
        summaryRequested: true,
        translationRequested: true,
        bytesUploaded: 1292288,
        audioSeconds: 128.4,
        summaryInputTokens: 900,
        summaryOutputTokens: 120,
        translationCharacters: 4321,
        usageMonth: "2026-08",
        startedAt: "2026-08-06T01:02:03.000Z",
        updatedAt: "2026-08-06T01:02:03.000Z",
      }),
    );
  });

  it("retains no content, filename, or storage keys", () => {
    const record = toUsageRecord(
      transcription({
        downloadKey: `users/${IDENTITY_ID}/${JOB_ID}.json`,
        summaryKey: `users/${IDENTITY_ID}/summary/${JOB_ID}`,
        translationKey: `users/${IDENTITY_ID}/translations/${JOB_ID}/es`,
      }),
    );

    const serialised = JSON.stringify(record);
    expect(serialised).not.toContain("Confidential");
    expect(serialised).not.toContain("filename");
    expect(serialised).not.toContain("downloadKey");
    expect(serialised).not.toContain("summaryKey");
    expect(serialised).not.toContain("translationKey");
    expect(serialised).not.toContain("users/");
  });

  it("records the language Transcribe resolved for a multi-language job", () => {
    const record = toUsageRecord(
      transcription({
        transcriptionResponse: {
          TranscriptionJob: {
            TranscriptionJobStatus: TranscriptionJobStatus.IN_PROGRESS,
            LanguageCodes: [{ LanguageCode: "fr-FR" }],
            LanguageOptions: ["en-AU", "fr-FR"],
          },
        },
      }),
    );

    expect(record.resolvedLanguage).toEqual("fr-FR");
    expect(record.status).toEqual(TranscriptionJobStatus.IN_PROGRESS);
    expect(record.completedAt).toBeUndefined();
  });

  it("stamps completedAt and the failure reason for a terminal job", () => {
    const record = toUsageRecord(
      transcription({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason: "The Research Project ID (RPID) is required.",
          },
        },
      }),
    );

    expect(record.status).toEqual("FAILED");
    expect(record.failureReason).toEqual(
      "The Research Project ID (RPID) is required.",
    );
    expect(record.completedAt).toEqual("2026-08-06T01:02:03.000Z");
  });

  it("treats a job with no target language as untranslated", () => {
    const record = toUsageRecord(
      transcription({
        metadata: {
          ...transcription().metadata,
          targetlanguage: "",
          generatesummary: "false",
        },
      }),
    );

    expect(record.translationRequested).toBe(false);
    expect(record.targetLanguage).toBeUndefined();
    expect(record.summaryRequested).toBe(false);
  });

  it("carries the translation status and failure message", () => {
    const record = toUsageRecord(
      transcription({
        translationJob: {
          jobId: "tjid",
          status: "FAILED",
          message: "UnsupportedLanguagePairException",
        },
      }),
    );

    expect(record.translationStatus).toEqual("FAILED");
    expect(record.translationFailureReason).toEqual(
      "UnsupportedLanguagePairException",
    );
  });
});
