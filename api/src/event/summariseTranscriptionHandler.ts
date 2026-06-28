import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { S3Event } from "aws-lambda";
import xray from "aws-xray-sdk";
import { Transcription } from "model";

import { bedrockClientConfig, invokeModel } from "../client/bedrockClient";
import {
  getTranscription,
  normaliseJobId,
  summaryKey as updateSummaryKey,
} from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const outputPattern = /^users\/([^/]+)\/([^/]+)$/;

const s3Client = new S3Client({ region });
const bedrockClient = new BedrockRuntimeClient(bedrockClientConfig);

const GENERATE_SUMMARY_PROMPT =
  process.env.GENERATE_SUMMARY_PROMPT ??
  "Summarise the following transcript in a single paragraph, under 100 words " +
    "relying strictly on the text provided.";
const NO_PREAMBLE_PROMPT =
  process.env.NO_PREAMBLE_PROMPT ??
  "Skip the preamble and go straight into the summary.";

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(s3Client);
}

export const handler = async (event: S3Event) => {
  const promises = [];
  let summaryCount = 0;
  for (const record of event["Records"]) {
    const key = decodeURIComponent(record["s3"]["object"]["key"]);
    const bucketName = record["s3"]["bucket"]["name"];

    // users/{identityId}/{fileName}
    const match = key.match(outputPattern);
    if (!match) {
      console.error("Unexpected key: ", key);
      continue;
    }
    const [, identityId, fileName] = match;
    const summaryKey = `users/${identityId}/summary/${normaliseJobId(fileName.split(".")[0])}`;

    const jobId = normaliseJobId(fileName.split(".")[0]);
    promises.push(
      getTranscription(identityId, jobId)
        .then((transcriptionRecord) => {
          return transcriptionRecord as Transcription;
        })
        .then(
          ({ metadata: { generatesummary: generateSummary } }: Transcription) =>
            JSON.parse(generateSummary?.toLowerCase()),
        )
        .then(async (generateSummary: boolean) => {
          if (generateSummary) {
            summaryCount += 1;
            return s3Client
              .send(new GetObjectCommand({ Bucket: bucketName, Key: key }))
              .then((result) => result.Body?.transformToString())
              .then(
                (rawTranscription) =>
                  rawTranscription && JSON.parse(rawTranscription),
              )
              .then(
                (transcription) =>
                  transcription?.results.transcripts.at(0)?.transcript,
              )
              .then((transcript: string) =>
                invokeModel(
                  bedrockClient,
                  `${GENERATE_SUMMARY_PROMPT} <transcript>${transcript}</transcript> ${NO_PREAMBLE_PROMPT}`,
                ),
              )
              .then((summary: string) =>
                s3Client.send(
                  new PutObjectCommand({
                    Bucket: bucketName,
                    Key: summaryKey,
                    Body: summary,
                  }),
                ),
              )
              .then(() => updateSummaryKey(identityId, jobId, summaryKey));
          } else {
            return Promise.resolve({});
          }
        }),
    );
  }

  await Promise.all(promises);
  return `Processed ${event["Records"].length} uploads, generated ${summaryCount} summaries.`;
};
