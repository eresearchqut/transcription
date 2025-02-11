import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { S3Event } from "aws-lambda";
import xray from "aws-xray-sdk";
import { Transcription } from "model";

import { invokeModel, bedrockClientConfig } from "../client/bedrockClient";
import {
  getTranscription,
  summaryKey as updateSummaryKey,
} from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const outputPattern = /private\/(.*)\/(.*)\/(.*)/gm;

const s3Client = new S3Client({ region });
const bedrockClient = new BedrockRuntimeClient(bedrockClientConfig);

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(s3Client);
}

export const handler = async (event: S3Event) => {
  const promises = [];
  let summaryCount = 0;
  for (const record of event["Records"]) {
    const key = decodeURIComponent(record["s3"]["object"]["key"]);
    const bucketName = record["s3"]["bucket"]["name"];
    const [matchedKey, cognitoId, identityId, fileName] = [
      ...key.matchAll(outputPattern),
    ][0];
    if (matchedKey) {
      const jobId = fileName.split(".")[0];
      const summaryKey = `${identityId}/summary/${jobId}`;
      const privateSummaryKey = `private/${cognitoId}/${summaryKey}`;
      promises.push(
        getTranscription(identityId, jobId)
          .then((transcriptionRecord) => {
            return transcriptionRecord as Transcription;
          })
          .then(
            ({
              metadata: { generatesummary: generateSummary },
            }: Transcription) => JSON.parse(generateSummary?.toLowerCase()),
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
                    `Provide a professional summary, of the following transcript that is clear and concise, ` +
                      `relying strictly on the text provided, and without telling me "here it is". Keep it to a ` +
                      `single paragraph, under 100 words. Transcript: ${transcript}`,
                  ),
                )
                .then((summary: string) =>
                  s3Client.send(
                    new PutObjectCommand({
                      Bucket: bucketName,
                      Key: privateSummaryKey,
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
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  await Promise.all(promises);
  return `Processed ${event["Records"].length} uploads, generated ${summaryCount} summaries.`;
};
