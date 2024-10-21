import { Transcription } from "@/pages/transcription";
import {
  Context,
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import Auth from "@aws-amplify/auth";
import { useInterval } from "@chakra-ui/hooks";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface TranscriptionsContextState {
  transcriptions: Transcription[];
}

export interface TranscriptionsContextOperations {
  getStatus(transcription: Transcription): string | undefined;
  subscribeToTranscriptionJob(id: string): void;
}

export const TranscriptionsContext: Context<
  TranscriptionsContextState & TranscriptionsContextOperations
> = createContext(
  {} as TranscriptionsContextState & TranscriptionsContextOperations,
);

export const TranscriptionsContextProvider: FunctionComponent<
  PropsWithChildren
> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [pollDelay, setPollDelay] = useState<number | null>(null);

  const getStatus = (transcription: Transcription) =>
    (transcription.jobStatusUpdated?.detail.TranscriptionJobStatus ||
      transcription.transcriptionResponse?.TranscriptionJob
        ?.TranscriptionJobStatus) ??
    undefined;

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

            const subscribedJobs = loaded.filter((job) =>
              subscriptions.has(job.sk),
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
    setPollDelay(5000);
  };

  return (
    <TranscriptionsContext.Provider
      value={{
        transcriptions,
        subscribeToTranscriptionJob,
        getStatus,
      }}
    >
      {children}
    </TranscriptionsContext.Provider>
  );
};
