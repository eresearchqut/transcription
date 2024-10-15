import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  LanguageCode,
  PiiEntityType,
  RedactionOutput,
  RedactionType,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import { S3Event } from "aws-lambda";
import xray from "aws-xray-sdk";

import { jobStarted } from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";
const uploadPattern = /private\/(.*)\/(.*)\/(.*)\.upload/gm;

const transcribeClient = new TranscribeClient({ region });
const s3client = new S3Client({ region: process.env.AWS_REGION });

xray.captureAWSv3Client(transcribeClient);
xray.captureAWSv3Client(s3client);

export const handler = async (event: S3Event) => {
  for (const record of event["Records"]) {
    try {
      const objectKey = decodeURIComponent(record["s3"]["object"]["key"]);
      const key = record["s3"]["object"]["key"].replace(/\+/g, " "); // https://stackoverflow.com/a/61869212
      const bucketName = record["s3"]["bucket"]["name"];
      const [matchedKey, cognitoId, identityId, jobId] = [
        ...key.matchAll(uploadPattern),
      ][0];

      if (matchedKey) {
        const headResponse = await s3client.send(
          new HeadObjectCommand({
            Bucket: record["s3"]["bucket"]["name"],
            Key: objectKey,
          }),
        );

        if (headResponse.Metadata === undefined) {
          continue;
        }

        const languageCode = headResponse.Metadata["languagecode"];

        console.log("headResponse.Metadata");
        console.log(headResponse.Metadata);

        const languages: string[] =
          headResponse.Metadata["languages"].split(/,\s?/);
        const hasIdentifiedAllLanguages: boolean = JSON.parse(
          headResponse.Metadata["hasIdentifiedAllLanguages".toLowerCase()],
        );
        const hasMultipleLanguages: boolean = JSON.parse(
          headResponse.Metadata["hasMultipleLanguages".toLowerCase()],
        );
        const enablePiiRedaction: boolean = JSON.parse(
          headResponse.Metadata["enablePiiRedaction".toLowerCase()],
        );

        const languageParams = {
          ...(hasMultipleLanguages
            ? {
                IdentifyMultipleLanguages: true,
                LanguageOptions: hasIdentifiedAllLanguages
                  ? languages.map((language) => language as LanguageCode)
                  : undefined,
              }
            : hasIdentifiedAllLanguages
            ? {
                LanguageCode:
                  languages.length > 0
                    ? (languages.at(0) as LanguageCode)
                    : LanguageCode.EN_AU,
              }
            : {
                IdentifyLanguage: true,
              }),
        };

        const piiParams = {
          ...(enablePiiRedaction
            ? {
                ContentRedaction: {
                  RedactionOutput: RedactionOutput.REDACTED,
                  RedactionType: RedactionType.PII,
                  PiiEntityTypes: [PiiEntityType.ALL],
                },
              }
            : {}),
        };

        const cognitoGuid = cognitoId.split("%3A")[1];

        // Member must satisfy regular expression pattern: [a-zA-Z0-9-_.!*'()/]{1,1024}$, i.e. no colons or escaped colons
        const outputKey = `transcription/${cognitoGuid}/${identityId}/${jobId}.json`;
        const params = {
          TranscriptionJobName: `${identityId}_${jobId}`,
          ...languageParams,
          ...piiParams,
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
        console.log("transcription params", params);
        const transcriptionResponse = await transcribeClient.send(
          new StartTranscriptionJobCommand(params),
        );
        try {
          await jobStarted(
            identityId,
            jobId,
            outputKey,
            record["s3"],
            transcriptionResponse,
            headResponse.Metadata,
          );
        } catch (error) {
          console.error("Failed to save job details", error);
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
