import { HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  LanguageCode,
  PiiEntityType,
  RedactionOutput,
  RedactionType,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import type { RpidDto } from "@eresearchqut/dmp-api";
import type { S3Event } from "aws-lambda";
import xray from "aws-xray-sdk";

import { getRpid } from "../client/dmpClient";
import s3client from "../client/s3Client";
import { jobRejected, jobStarted } from "../service/transcriptionService";

const region = process.env.AWS_REGION || "ap-southeast-2";
const transcribeBucket = process.env.BUCKET_NAME || "transcriptions";
const uploadPattern = /^users\/([^/]+)\/([^/]+)\.upload$/;

const transcribeClient = new TranscribeClient({ region });

xray.captureAWSv3Client(transcribeClient);
xray.captureAWSv3Client(s3client);

/**
 * Finds the upload's RPID among the user's active projects, or gives the
 * reason to refuse the upload, which is shown to the user as the job's
 * failure reason.
 */
const checkRpid = async (
  identityId: string,
  rpid: string | undefined,
): Promise<{ project: RpidDto } | { rejection: string }> => {
  if (!rpid) {
    return {
      rejection:
        "A Research Project ID (RPID) is required to start a transcription.",
    };
  }
  try {
    const project = await getRpid(identityId, rpid);
    if (project) {
      return { project };
    }
    return {
      rejection: `The Research Project ID (RPID) ${rpid} is not one of your active projects in the Data Management Planning tool.`,
    };
  } catch (error) {
    console.error(`Failed to validate RPID ${rpid}`, error);
    return {
      rejection: `The Research Project ID (RPID) ${rpid} could not be checked with the Data Management Planning tool. Please try again later.`,
    };
  }
};

export const handler = async (event: S3Event) => {
  let uploadsCount = 0;
  for (const record of event.Records) {
    try {
      // S3 encodes spaces as "+" and percent-encodes other characters; normalise both. https://stackoverflow.com/a/61869212
      const objectKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " "),
      );
      const bucketName = record.s3.bucket.name;
      const match = uploadPattern.exec(objectKey);

      if (!match) {
        console.error("Unexpected key: ", objectKey);
        continue;
      }

      const [, identityId, jobId] = match;

      const headResponse = await s3client.send(
        new HeadObjectCommand({
          Bucket: record.s3.bucket.name,
          Key: objectKey,
        }),
      );

      if (headResponse.Metadata === undefined) {
        continue;
      }

      const languages: string[] = headResponse.Metadata.languages.split(/,\s?/);
      const enablePiiRedaction: boolean = JSON.parse(
        headResponse.Metadata["enablePiiRedaction".toLowerCase()],
      );

      const rpidCheck = await checkRpid(identityId, headResponse.Metadata.rpid);
      if ("rejection" in rpidCheck) {
        await jobRejected(
          identityId,
          jobId,
          record.s3,
          headResponse.Metadata,
          rpidCheck.rejection,
        );
        continue;
      }

      const languageParams = {
        ...(enablePiiRedaction
          ? {
              LanguageCode: LanguageCode.EN_US,
            }
          : languages.length > 1
            ? {
                IdentifyMultipleLanguages: true,
                LanguageOptions: languages.map(
                  (language) => language as LanguageCode,
                ),
              }
            : languages.length > 0
              ? {
                  LanguageCode: languages.at(0) as LanguageCode,
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

      // Member must satisfy regular expression pattern: [a-zA-Z0-9-_.!*'()/]{1,1024}$, i.e. no colons or escaped colons
      const outputKey = `transcription/${identityId}/${jobId}.json`;
      const params = {
        TranscriptionJobName: `${identityId}_${jobId}`,
        ...languageParams,
        ...piiParams,
        Media: {
          MediaFileUri: `https://s3-${region}.amazonaws.com/${bucketName}/${objectKey}`,
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
          record.s3,
          transcriptionResponse,
          headResponse.Metadata,
          rpidCheck.project as unknown as Record<string, unknown>,
        ).then(() => uploadsCount++);
      } catch (error) {
        console.error("Failed to save job details", error);
      }
    } catch (e) {
      console.error(e);
    }
  }
  return `Processed ${uploadsCount} uploads`;
};
