import { useState } from "react";
import { useInterval } from "@chakra-ui/hooks";
import Auth from "@aws-amplify/auth";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface Transcription {
  pk: string;
  sk: string;
  metadata: {
    filetype: string;
    languagecode: string;
    mimetype: string;
    filename: string;
  };
  date: string;
  downloadKey?: string;
  ttl: number;
  jobStatusUpdated?: {
    detail: {
      TranscriptionJobStatus: string;
      FailureReason?: string;
    };
  };
  transcriptionResponse?: {
    TranscriptionJob?: {
      TranscriptionJobStatus: string;
    };
  };
  uploadEvent: {
    object: {
      size: number;
      key: string;
    };
  };
}

export enum TranscriptionJobStatus {
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
}

type PollMode = "SUBSCRIBE" | "AUTO";

export interface UseTranscriptionsProps {
  pollMode: PollMode;
}

export interface UseTranscriptionState {
  transcriptions: Transcription[];
  getStatus(transcription: Transcription): TranscriptionJobStatus | undefined;
  subscribeToTranscriptionJob(id: string): void;
}

export const useTranscriptions = ({
  pollMode,
}: UseTranscriptionsProps): UseTranscriptionState => {
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [pollDelay, setPollDelay] = useState<number | null>(
    pollMode == "AUTO" ? 100 : null,
  );

  const getStatus = (
    transcription: Transcription,
  ): TranscriptionJobStatus | undefined =>
    (transcription.jobStatusUpdated?.detail.TranscriptionJobStatus ||
      transcription.transcriptionResponse?.TranscriptionJob
        ?.TranscriptionJobStatus) as TranscriptionJobStatus;

  useInterval(() => {
    Auth.currentSession()
      .then((currentSession) => currentSession.getIdToken().getJwtToken())
      .then(
        (idToken) =>
          ({
            Authorization: `Bearer ${idToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          }) as HeadersInit,
      )
      .then((headers) =>
        fetch(`${API_ENDPOINT}/transcription`, {
          headers,
        })
          .then((res) => res.json())
          .then((loaded: Transcription[]) => {
            setTranscriptions(loaded);

            const subscribedJobs = loaded.filter(
              (job) =>
                pollMode === "AUTO" ||
                (pollMode === "SUBSCRIBE" && subscriptions.has(job.sk)),
            );

            const subscribedJobsInProgress = subscribedJobs.find(
              (job) =>
                ["QUEUED", "IN_PROGRESS"].find(
                  (inProgressStatus) => getStatus(job) === inProgressStatus,
                ) ||
                ("COMPLETED" === getStatus(job) && !job.downloadKey),
            );

            if (subscribedJobsInProgress) {
              setPollDelay(5000);
            } else {
              setPollDelay(null);
            }
          }),
      );
  }, pollDelay);

  const subscribeToTranscriptionJob = (id: string) => {
    setSubscriptions((current) => new Set([...Array.from(current), id]));
    setPollDelay(100);
  };

  return {
    transcriptions,
    getStatus,
    subscribeToTranscriptionJob,
  };
};

export default useTranscriptions;
