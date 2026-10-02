import { CopyObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

import type { S3Handler } from "aws-lambda";
import xray from "aws-xray-sdk";

import s3Client from "../client/s3Client";
import { downloadKey } from "../service/transcriptionService";
import {
  type TranscriptDocument,
  transcriptDurationSeconds,
} from "../util/transcript";

const outputPattern = /^transcription\/([^/]+)\/([^/]+)$/;

xray.captureAWSv3Client(s3Client);

const measureAudioSeconds = async (
  bucketName: string,
  key: string,
): Promise<number | undefined> => {
  try {
    const raw = await s3Client
      .send(new GetObjectCommand({ Bucket: bucketName, Key: key }))
      .then((result) => result.Body?.transformToString());
    if (!raw) {
      return undefined;
    }
    return transcriptDurationSeconds(JSON.parse(raw) as TranscriptDocument);
  } catch (e) {
    console.error(`Failed to measure the duration of ${key} because: ${e}`, e);
    return undefined;
  }
};

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
        const audioSeconds = await measureAudioSeconds(bucketName, key);
        await downloadKey(identityId, jobId, usersKey, audioSeconds);
      } catch (e) {
        console.error(`Failed to copy ${key} to ${usersKey} because: ${e}`, e);
      }
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  console.log(`Processed ${event.Records.length} uploads`);
};
