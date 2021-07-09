const { S3Client, GetObjectTaggingCommand } = require("@aws-sdk/client-s3");
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");
const { jobStarted } = require("../service/transcriptionService");
const { v4: uuid } = require("uuid");

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";
const transcribeClient = new TranscribeClient({ region });

const uploadPattern = /private\/(.*)\/(.*)\/(.*)/gm;
const fileExtensionPattern = /(?:\.([^.]+))?$/; // https://stackoverflow.com/a/680982

const mediaFormat = (fileExtension) => {
  switch (fileExtension) {
    case "3ga":
      return "amr";
      break;
    case "m4a":
      return "mp4";
      break;
    case "oga":
      return "ogg";
      break;
    case "opus":
      return "ogg";
      break;
    default:
      return fileExtension;
  }
};

const s3client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log(JSON.stringify(event));

  for (const record of event["Records"]) {
    const objectKey = decodeURI(record["s3"]["object"]["key"]);

    const taggingResponse = await s3client.send(
      new GetObjectTaggingCommand({
        Bucket: record["s3"]["bucket"]["name"],
        Key: objectKey,
      })
    );

    const objectTags = new Map(
      taggingResponse.TagSet.map((tag) => [tag.Key, tag.Value])
    );

    if (!(objectTags.get("fileType") === "userUploadedFile")) continue;

    const fileName = objectTags.get("fileName");
    const languageCode = objectTags.get("languageCode");

    const key = record["s3"]["object"]["key"].replace(/\+/g, " "); // https://stackoverflow.com/a/61869212
    const bucketName = record["s3"]["bucket"]["name"];
    const [matchedKey, cognitoId, identityId, _] = [
      ...key.matchAll(uploadPattern),
    ][0];
    console.log(matchedKey, cognitoId, identityId, fileName);
    if (matchedKey) {
      const fileExtension = fileExtensionPattern.exec(fileName)[1];
      const jobId = uuid();
      const outputKey = `private/${cognitoId}/${identityId}/output/${jobId}.json`;
      if (fileExtension) {
        const params = {
          TranscriptionJobName: `${identityId}_${jobId}`,
          LanguageCode: languageCode,
          MediaFormat: mediaFormat(fileExtension),
          Media: {
            MediaFileUri: `https://s3-${region}.amazonaws.com/${bucketName}/${key}`,
          },
          OutputBucketName: transcribeBucket,
          OutputKey: outputKey,
          Settings: {
            ShowSpeakerLabels: true,
            ShowAlternatives: true,
            MaxAlternatives: 10,
            MaxSpeakerLabels: 10,
          },
        };
        const transcriptionResponse = await transcribeClient.send(
          new StartTranscriptionJobCommand(params)
        );
        console.log(
          identityId,
          jobId,
          outputKey,
          JSON.stringify({
            uploadEvent: record["s3"],
            transcriptionResponse,
          })
        );
        try {
          await jobStarted(
            identityId,
            jobId,
            outputKey,
            record["s3"],
            transcriptionResponse
          );
          console.info("Saved job details", identityId);
        } catch (error) {
          console.error("Failed to save job details", error);
        }
      } else {
        console.error("Unexpected filename: ", fileName);
      }
    } else {
      console.error("Unexpected key: ", key);
    }
  }

  return `Processed ${event["Records"].length} uploads`;
};
