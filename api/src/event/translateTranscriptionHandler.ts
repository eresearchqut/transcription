import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  GetTranscriptionJobCommand,
  TranscribeClient,
  TranscriptionJob,
} from "@aws-sdk/client-transcribe";
import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

import xray from "aws-xray-sdk";
import { Transcription, enableTranslation, toTranslateSourceCode } from "model";

import {
  getTranscription,
  normaliseJobId,
  translationKey as updateTranslationKey,
} from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";

// Amazon Translate accepts at most 10,000 UTF-8 bytes per TranslateText request;
// leave headroom for safety.
const MAX_TRANSLATE_BYTES = 9000;
// Bounded concurrency keeps us well under Translate's default request rate while
// preserving a strict 1:1 segment -> translation mapping.
const TRANSLATE_CONCURRENCY = 8;

const s3Client = new S3Client({ region });
const transcribeClient = new TranscribeClient({ region });
const translateClient = new TranslateClient({ region });

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(s3Client);
  xray.captureAWSv3Client(transcribeClient);
  xray.captureAWSv3Client(translateClient);
}

interface Segment {
  start_time: string;
  end_time: string;
  alternatives: { transcript: string }[];
}

interface TranscriptResults {
  transcripts?: { transcript: string }[];
  segments?: Segment[];
  speaker_labels?: unknown;
  items?: unknown;
}

interface TranscriptDocument {
  results: TranscriptResults;
  [key: string]: unknown;
}

/**
 * Map over items with bounded concurrency, preserving input order.
 */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

/**
 * Split text into chunks no larger than maxBytes (UTF-8), breaking on word
 * boundaries so a single oversized segment still fits Translate's per-request
 * limit.
 */
const splitByByteLimit = (text: string, maxBytes: number): string[] => {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) {
    return [text];
  }
  const chunks: string[] = [];
  let current = "";
  for (const word of text.split(/(\s+)/)) {
    if (current && Buffer.byteLength(current + word, "utf8") > maxBytes) {
      chunks.push(current);
      current = "";
    }
    current += word;
  }
  if (current) chunks.push(current);
  return chunks;
};

export const handler = async (event: { detail?: TranscriptionJob }) => {
  const transcriptionJobName = event?.detail?.TranscriptionJobName?.replace(
    /'/g,
    "",
  );
  if (transcriptionJobName === undefined) {
    console.error("Missing TranscriptionJobName", { event });
    return "No transcription job name";
  }

  const [identityId, rawJobId] = transcriptionJobName.split("_");
  if (identityId === undefined || rawJobId === undefined) {
    console.error("Unexpected job name", { transcriptionJobName });
    return "Unexpected job name";
  }
  const jobId = normaliseJobId(rawJobId);

  const record = (await getTranscription(identityId, jobId)) as
    | Transcription
    | undefined;
  if (!record) {
    console.error("No transcription record", { identityId, jobId });
    return "No transcription record";
  }
  if (!enableTranslation(record)) {
    return "No translation requested";
  }
  const targetLanguage = record.metadata.targetlanguage!;

  // Resolve the source language from the completed job (the StartTranscriptionJob
  // response stored at upload time does not contain the resolved code for
  // language-identification / multi-language jobs).
  const { TranscriptionJob: job } = await transcribeClient.send(
    new GetTranscriptionJobCommand({
      TranscriptionJobName: transcriptionJobName,
    }),
  );
  const transcribeLanguage =
    job?.LanguageCode ?? job?.LanguageCodes?.[0]?.LanguageCode;
  if (!transcribeLanguage) {
    console.error("Could not resolve source language", {
      transcriptionJobName,
    });
    return "No source language";
  }
  const sourceLanguage = toTranslateSourceCode(transcribeLanguage);
  const isRedacted = job?.ContentRedaction != null;

  // Read the canonical Transcribe output (not the users/ copy, which may not yet
  // exist when the COMPLETED event fires). Redaction prepends "redacted-" to the
  // output file name.
  const outputKey = `transcription/${identityId}/${isRedacted ? "redacted-" : ""}${jobId}.json`;
  const translationOutputKey = `users/${identityId}/translations/${jobId}/${targetLanguage}`;

  const transcriptRaw = await s3Client
    .send(new GetObjectCommand({ Bucket: transcribeBucket, Key: outputKey }))
    .then((result) => result.Body?.transformToString());
  if (!transcriptRaw) {
    console.error("Empty transcript", { outputKey });
    return "Empty transcript";
  }
  const transcript: TranscriptDocument = JSON.parse(transcriptRaw);

  // Source == target: no translation needed, persist the original transcript at
  // the translation key so the UI still has a "translated" artifact to offer.
  if (sourceLanguage === targetLanguage) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: transcribeBucket,
        Key: translationOutputKey,
        Body: transcriptRaw,
        ContentType: "application/json",
      }),
    );
    await updateTranslationKey(identityId, jobId, translationOutputKey);
    return "Source language matches target; copied original transcript";
  }

  const segments = transcript.results.segments ?? [];

  const translatedSegments = await mapWithConcurrency(
    segments,
    TRANSLATE_CONCURRENCY,
    async (segment) => {
      const text = segment.alternatives?.[0]?.transcript ?? "";
      if (!text.trim()) {
        return { ...segment, alternatives: [{ transcript: text }] };
      }
      const parts = await Promise.all(
        splitByByteLimit(text, MAX_TRANSLATE_BYTES).map((chunk) =>
          translateClient
            .send(
              new TranslateTextCommand({
                SourceLanguageCode: sourceLanguage,
                TargetLanguageCode: targetLanguage,
                Text: chunk,
              }),
            )
            .then((response) => response.TranslatedText ?? chunk),
        ),
      );
      return { ...segment, alternatives: [{ transcript: parts.join("") }] };
    },
  );

  const fullTranslatedTranscript = translatedSegments
    .map((segment) => segment.alternatives[0].transcript)
    .join(" ")
    .trim();

  // Build a Transcribe-shaped document with translated segments, preserving
  // segment timings and speaker labels so the existing DOCX generator and the
  // segment-based subtitle builder produce timed translated output. Word-level
  // `items` are dropped (no per-word translation/timing exists).
  const restResults = { ...transcript.results };
  delete restResults.items;
  const translatedDocument = {
    ...transcript,
    results: {
      ...restResults,
      transcripts: [{ transcript: fullTranslatedTranscript }],
      segments: translatedSegments,
    },
  };

  await s3Client.send(
    new PutObjectCommand({
      Bucket: transcribeBucket,
      Key: translationOutputKey,
      Body: JSON.stringify(translatedDocument),
      ContentType: "application/json",
    }),
  );
  await updateTranslationKey(identityId, jobId, translationOutputKey);

  return `Translated ${translatedSegments.length} segments from ${sourceLanguage} to ${targetLanguage}`;
};
