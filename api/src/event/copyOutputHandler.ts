import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { S3Handler } from "aws-lambda";
import xray from "aws-xray-sdk";

import { downloadKey } from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const outputPattern = /transcription\/(.*)\/(.*)\/(.*)/gm;

const s3Client = new S3Client({ region });

xray.captureAWSv3Client(s3Client);

export const handler: S3Handler = async (event) => {
  for (const record of event["Records"]) {
    const key = record["s3"]["object"]["key"];
    const bucketName = record["s3"]["bucket"]["name"];
    const [matchedKey, cognitoGuid, identityId, fileName] = [
      ...key.matchAll(outputPattern),
    ][0];
    if (matchedKey) {
      const privateKey = `private/${region}:${cognitoGuid}/${identityId}/${fileName}`;
      const jobId = fileName.split(".")[0];
      try {
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: privateKey,
          }),
        );
        await downloadKey(identityId, jobId, `${identityId}/${fileName}`);
      } catch (e) {
        console.error(
          `Failed to copy ${key} to ${privateKey} because: ${e}`,
          e,
        );
      }
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  console.log(`Processed ${event["Records"].length} uploads`);
};
