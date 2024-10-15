import { StartTranscriptionJobResponse } from "@aws-sdk/client-transcribe";

import {
  getResources,
  putResource,
  updateResource,
} from "../repository/repository";

const normaliseJobId = (jobId: string): string =>
  jobId.split("redacted-").at(-1) ?? jobId;

export const jobStarted = (
  identityId: string,
  jobId: string,
  outputKey: string,
  uploadEvent: Record<string, unknown>,
  transcriptionResponse: StartTranscriptionJobResponse,
  metadata: Record<string, unknown>,
) =>
  putResource(identityId, jobId, {
    outputKey,
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse)),
    metadata: JSON.parse(JSON.stringify(metadata)),
  });

export const jobStatusUpdated = (
  identityId: string,
  jobId: string,
  jobStatusUpdated: Record<string, unknown>,
) =>
  updateResource(
    identityId,
    normaliseJobId(jobId),
    "jobStatusUpdated",
    JSON.parse(JSON.stringify(jobStatusUpdated)),
  );

export const downloadKey = (
  identityId: string,
  jobId: string,
  downloadKey: string,
) =>
  updateResource(identityId, normaliseJobId(jobId), "downloadKey", downloadKey);

export const getTranscriptions = (identityId: string) =>
  getResources(identityId);
