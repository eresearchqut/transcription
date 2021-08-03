const {
  TranscribeClient,
  StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { jobStarted } = require("../service/transcriptionService");

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";
const transcribeClient = new TranscribeClient({ region });

const uploadPattern = /private\/(.*)\/(.*)\/(.*)\.upload/gm;

// Supported mime types mapped to valid media formats mp3 | mp4 | wav | flac | ogg | amr | webm
const MIME_TYPE_MEDIA_FORMAT = {
  "audio/flac": "flac",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "video/mp4": "mp4",
  "audio/m4a": "mp4",
  "application/ogg": "ogg",
  "audio/ogg": "ogg",
  "video/ogg": "ogg",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/amr": "amr",
  "audio/3gpp": "3ga",
  "audio/3gpp2": "3ga",
  "audio/x-wav": "wav",
  "audio/vnd.wave": "wav",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-pn-wav": "wav",
};

const s3client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.log(JSON.stringify(event));

  for (const record of event["Records"]) {
    try {
      const objectKey = decodeURIComponent(record["s3"]["object"]["key"]);
      const key = record["s3"]["object"]["key"].replace(/\+/g, " "); // https://stackoverflow.com/a/61869212
      const bucketName = record["s3"]["bucket"]["name"];
      const [matchedKey, cognitoId, identityId, jobId] = [
        ...key.matchAll(uploadPattern),
      ][0];

      console.log(matchedKey, cognitoId, identityId, jobId);

      if (matchedKey) {
        console.log(objectKey);

        const headResponse = await s3client.send(
          new HeadObjectCommand({
            Bucket: record["s3"]["bucket"]["name"],
            Key: objectKey,
          })
        );

        console.log(headResponse);

        const mimeType = headResponse.Metadata["mimetype"];
        const languageCode = headResponse.Metadata["languagecode"];

        if (mimeType && languageCode) {
          console.log(matchedKey, cognitoId, identityId, mimeType);

          const mediaFormat = MIME_TYPE_MEDIA_FORMAT[mimeType];
          const cognitoGuid = cognitoId.split("%3A")[1];

          // Member must satisfy regular expression pattern: [a-zA-Z0-9-_.!*'()/]{1,1024}$, i.e. no colons or escaped colons
          const outputKey = `transcription/${cognitoGuid}/${identityId}/${jobId}.json`;

          if (mediaFormat) {
            const params = {
              TranscriptionJobName: `${identityId}_${jobId}`,
              LanguageCode: languageCode,
              MediaFormat: mediaFormat,
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
            console.log("Launching translation job", JSON.stringify(params));
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
                transcriptionResponse,
                headResponse.Metadata
              );
              console.info("Saved job details", identityId);
            } catch (error) {
              console.error("Failed to save job details", error);
            }
          } else {
            console.error("Unexpected Mime Type: ", mimeType);
          }
        } else {
          console.error(
            "Missing filename or language code in metadata.",
            headResponse.Metadata
          );
        }
      } else {
        console.error("Unexpected key: ", key);
      }
    } catch (e) {
      console.error(e);
    }
  }
  return `Processed ${event["Records"].length} uploads`;
};
