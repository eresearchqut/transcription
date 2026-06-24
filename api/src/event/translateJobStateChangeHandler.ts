import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DescribeTextTranslationJobCommand,
  TranslateClient,
} from "@aws-sdk/client-translate";

import xray from "aws-xray-sdk";
import { Transcription } from "model";

import {
  getTranscription,
  normaliseJobId,
  translationJob as updateTranslationJob,
  translationKey as updateTranslationKey,
} from "../service/transcriptionService";
import {
  TranscriptDocument,
  assembleTranslatedDocument,
} from "../util/transcript";
import { XLIFF_FILE_NAME, parseXliffTargets } from "../util/xliff";

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";

const s3Client = new S3Client({ region });
const translateClient = new TranslateClient({ region });

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(s3Client);
  xray.captureAWSv3Client(translateClient);
}

/** Split an s3://bucket/key URI into its bucket and key. */
const parseS3Uri = (uri: string): { bucket: string; key: string } => {
  const withoutScheme = uri.replace(/^s3:\/\//, "");
  const slash = withoutScheme.indexOf("/");
  return {
    bucket: withoutScheme.slice(0, slash),
    key: withoutScheme.slice(slash + 1),
  };
};

export const handler = async (event: {
  detail?: { jobId?: string; jobStatus?: string };
}) => {
  const translateJobId = event?.detail?.jobId;
  if (!translateJobId) {
    console.error("Missing jobId", { event });
    return "No job id";
  }

  const { TextTranslationJobProperties: job } = await translateClient.send(
    new DescribeTextTranslationJobCommand({ JobId: translateJobId }),
  );
  if (!job?.JobName) {
    console.error("No job properties", { translateJobId });
    return "No job properties";
  }

  const [identityId, rawJobId] = job.JobName.split("_");
  if (identityId === undefined || rawJobId === undefined) {
    console.error("Unexpected job name", { jobName: job.JobName });
    return "Unexpected job name";
  }
  const jobId = normaliseJobId(rawJobId);
  const status = job.JobStatus ?? event.detail?.jobStatus ?? "FAILED";

  if (status !== "COMPLETED") {
    await updateTranslationJob(identityId, jobId, {
      jobId: translateJobId,
      status,
      message: job.Message ?? "Translation job did not complete successfully",
    });
    return `Translation job ${translateJobId} ${status}`;
  }

  const record = (await getTranscription(identityId, jobId)) as
    | Transcription
    | undefined;
  if (!record) {
    console.error("No transcription record", { identityId, jobId });
    return "No transcription record";
  }
  const targetLanguage =
    job.TargetLanguageCodes?.[0] ?? record.metadata.targetlanguage!;

  // Read the translated XLIFF from the job's output folder
  // ({output}/{targetLang}.source.xlf) and map trans-unit ids -> translated text.
  const outputUri = job.OutputDataConfig?.S3Uri;
  if (!outputUri) {
    console.error("No output location", { translateJobId });
    return "No output location";
  }
  const { bucket: outputBucket, key: outputPrefix } = parseS3Uri(outputUri);
  const outputKey = `${outputPrefix}${targetLanguage}.${XLIFF_FILE_NAME}`;
  const translatedXliff = await s3Client
    .send(new GetObjectCommand({ Bucket: outputBucket, Key: outputKey }))
    .then((result) => result.Body?.transformToString());
  if (!translatedXliff) {
    await updateTranslationJob(identityId, jobId, {
      jobId: translateJobId,
      status: "FAILED",
      message: "Translation output was empty",
    });
    return "Empty translation output";
  }
  const targets = parseXliffTargets(translatedXliff);

  // Re-read the original transcript for segment timings + speaker labels and
  // merge the translated text back onto it.
  const isRedacted = JSON.parse(
    record.metadata.enablepiiredaction?.toLowerCase() || "false",
  );
  const transcriptKey = `transcription/${identityId}/${isRedacted ? "redacted-" : ""}${jobId}.json`;
  const transcriptRaw = await s3Client
    .send(
      new GetObjectCommand({ Bucket: transcribeBucket, Key: transcriptKey }),
    )
    .then((result) => result.Body?.transformToString());
  if (!transcriptRaw) {
    console.error("Empty transcript", { transcriptKey });
    return "Empty transcript";
  }
  const transcript: TranscriptDocument = JSON.parse(transcriptRaw);
  const translatedDocument = assembleTranslatedDocument(transcript, targets);

  const translationOutputKey = `users/${identityId}/translations/${jobId}/${targetLanguage}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: transcribeBucket,
      Key: translationOutputKey,
      Body: JSON.stringify(translatedDocument),
      ContentType: "application/json",
    }),
  );
  await updateTranslationKey(identityId, jobId, translationOutputKey);
  await updateTranslationJob(identityId, jobId, {
    jobId: translateJobId,
    status: "COMPLETED",
  });

  return `Translated transcript written for ${identityId}/${jobId} (${targetLanguage})`;
};
