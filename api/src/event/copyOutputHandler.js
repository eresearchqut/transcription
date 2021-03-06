const { S3Client, CopyObjectCommand } = require("@aws-sdk/client-s3");
const { downloadKey } = require("../service/transcriptionService");
const xray = require("aws-xray-sdk");

const region = process.env.AWS_REGION || "ap-southeast-2";
const outputPattern = /transcription\/(.*)\/(.*)\/(.*)/gm;

const s3Client = new S3Client({ region });

xray.captureAWSv3Client(s3Client);

exports.handler = async (event) => {
  console.log(JSON.stringify(event));

  for (const record of event["Records"]) {
    const key = record["s3"]["object"]["key"];
    const bucketName = record["s3"]["bucket"]["name"];
    const [matchedKey, cognitoGuid, identityId, fileName] = [
      ...key.matchAll(outputPattern),
    ][0];
    console.log(matchedKey, cognitoGuid, identityId, fileName);
    if (matchedKey) {
      const privateKey = `private/${region}:${cognitoGuid}/${identityId}/${fileName}`;
      const jobId = fileName.split(".")[0];
      try {
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: privateKey,
          })
        );
        await downloadKey(identityId, jobId, `${identityId}/${fileName}`);
        console.log(`Copied ${key} to ${privateKey}`);
      } catch (e) {
        console.error(
          `Failed to copy ${key} to ${privateKey} because: ${e.message}`,
          e
        );
      }
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  return `Processed ${event["Records"].length} uploads`;
};
