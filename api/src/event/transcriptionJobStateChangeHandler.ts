import type { TranscriptionJob } from "@aws-sdk/client-transcribe";

import { jobStatusUpdated } from "../service/transcriptionService";

export const handler = async (event: { detail?: TranscriptionJob }) => {
  const transcriptionJobName = event?.detail?.TranscriptionJobName;
  if (transcriptionJobName === undefined) {
    console.error({ event });
    return;
  }

  const [identityId, jobId] = transcriptionJobName.split("_");
  if (identityId === undefined || jobId === undefined) {
    console.error({ identityId, jobId });
    return;
  }
  await jobStatusUpdated(identityId, jobId, event);
  return "Transcription job status updated";
};
