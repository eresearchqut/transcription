import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { S3Handler } from "aws-lambda";
import xray from "aws-xray-sdk";

import { s3ClientConfig } from "../client/s3Client";
import { downloadKey } from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const outputPattern = /^transcription\/([^/]+)\/([^/]+)$/;

const s3Client = new S3Client(s3ClientConfig);

xray.captureAWSv3Client(s3Client);

export const handler: S3Handler = async (event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    const bucketName = record.s3.bucket.name;

    // transcription/{identityId}/{fileName}
    const match = key.match(outputPattern);
    if (match) {
      const [, identityId, fileName] = match;
      const usersKey = `users/${identityId}/${fileName}`;
      const jobId = fileName.split(".")[0];
      try {
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: usersKey,
          }),
        );
        await downloadKey(identityId, jobId, usersKey);
      } catch (e) {
        console.error(`Failed to copy ${key} to ${usersKey} because: ${e}`, e);
      }
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  console.log(`Processed ${event.Records.length} uploads`);
};
