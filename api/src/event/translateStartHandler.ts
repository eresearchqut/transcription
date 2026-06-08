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
  StartTextTranslationJobCommand,
  TranslateClient,
} from "@aws-sdk/client-translate";

import xray from "aws-xray-sdk";
import { Transcription, enableTranslation, toTranslateSourceCode } from "model";

import {
  getTranscription,
  normaliseJobId,
  translationJob as updateTranslationJob,
  translationKey as updateTranslationKey,
} from "../service/transcriptionService";
import { TranscriptDocument, segmentTexts } from "../util/transcript";
import { XLIFF_FILE_NAME, buildXliff } from "../util/xliff";

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";
const dataAccessRoleArn = process.env.TRANSLATE_DATA_ACCESS_ROLE_ARN || "";

const s3Client = new S3Client({ region });
const transcribeClient = new TranscribeClient({ region });
const translateClient = new TranslateClient({ region });

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(s3Client);
  xray.captureAWSv3Client(transcribeClient);
  xray.captureAWSv3Client(translateClient);
}

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

  // Read the canonical Transcribe output (redaction prepends "redacted-").
  const outputKey = `transcription/${identityId}/${isRedacted ? "redacted-" : ""}${jobId}.json`;
  const translationOutputKey = `users/${identityId}/translations/${jobId}/${targetLanguage}`;

  const transcriptRaw = await s3Client
    .send(new GetObjectCommand({ Bucket: transcribeBucket, Key: outputKey }))
    .then((result) => result.Body?.transformToString());
  if (!transcriptRaw) {
    console.error("Empty transcript", { outputKey });
    return "Empty transcript";
  }

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
    await updateTranslationJob(identityId, jobId, {
      jobId: "",
      status: "COMPLETED",
    });
    return "Source language matches target; copied original transcript";
  }

  // Write the segments as an XLIFF document and start an asynchronous batch
  // translation job. Completion is handled by translateJobStateChangeHandler.
  const transcript: TranscriptDocument = JSON.parse(transcriptRaw);
  const xliff = buildXliff(
    segmentTexts(transcript),
    sourceLanguage,
    targetLanguage,
  );
  const inputPrefix = `translations/input/${identityId}/${jobId}/`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: transcribeBucket,
      Key: `${inputPrefix}${XLIFF_FILE_NAME}`,
      Body: xliff,
      ContentType: "application/x-xliff+xml",
    }),
  );

  const startResponse = await translateClient.send(
    new StartTextTranslationJobCommand({
      JobName: `${identityId}_${jobId}`,
      InputDataConfig: {
        S3Uri: `s3://${transcribeBucket}/${inputPrefix}`,
        ContentType: "application/x-xliff+xml",
      },
      OutputDataConfig: {
        S3Uri: `s3://${transcribeBucket}/translations/output/${identityId}/${jobId}/`,
      },
      DataAccessRoleArn: dataAccessRoleArn,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCodes: [targetLanguage],
      ClientToken: `${jobId}-${targetLanguage}`,
    }),
  );

  await updateTranslationJob(identityId, jobId, {
    jobId: startResponse.JobId ?? "",
    status: startResponse.JobStatus ?? "SUBMITTED",
  });

  return `Started translation job ${startResponse.JobId} (${sourceLanguage} -> ${targetLanguage})`;
};
