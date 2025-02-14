import { useEffect, useState } from "react";
import {
  enableGenerateSummary,
  mapTranscriptionStatus,
  Transcription,
  TranscriptionJobStatus,
} from "model";
import { useQuery } from "@tanstack/react-query";
import { getter } from "../client/fetchers";
import { isEmpty, isUndefined } from "lodash";
import { Auth, Storage } from "aws-amplify";
import { useLogout } from "../context/auth-context";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseTranscriptionProps {
  jobId: string;
  initialTranscription?: Transcription;
}

export interface UseTranscriptionState {
  transcription?: Transcription;
  summary?: string;
  isTranscribeCompleted: boolean;
  isPipelineCompleted: boolean;
}

export const useTranscription = ({
  jobId,
  initialTranscription,
}: UseTranscriptionProps): UseTranscriptionState => {
  const { handleLogout } = useLogout();
  const [transcription, setTranscription] = useState<Transcription | undefined>(
    initialTranscription,
  );
  const [summary, setSummary] = useState<string | undefined>();

  const currentStatus = mapTranscriptionStatus(transcription);
  const isTranscribeCompleted: boolean = transcription
    ? !isEmpty(transcription.downloadKey) &&
      !isUndefined(currentStatus) &&
      [
        TranscriptionJobStatus.FAILED,
        TranscriptionJobStatus.COMPLETED,
      ].includes(currentStatus!)
    : false;
  const isPipelineCompleted: boolean =
    !isUndefined(transcription) &&
    isTranscribeCompleted &&
    (enableGenerateSummary(transcription)
      ? !isEmpty(transcription?.summaryKey)
      : true);

  const { data } = useQuery({
    enabled: !isPipelineCompleted,
    queryKey: ["transcription", jobId],
    queryFn: async (): Promise<Transcription> =>
      getter({
        apiUrl: API_ENDPOINT,
        resource: "transcription",
        id: jobId,
      }),
    refetchInterval: 5000,
  });

  const { data: summaryResponse } = useQuery({
    enabled: !isEmpty(transcription?.summaryKey),
    queryKey: ["transcription.summary", jobId],
    queryFn: async (): Promise<string | undefined> => {
      return !isEmpty(transcription?.summaryKey)
        ? Auth.currentSession()
            .then(() =>
              Storage.get(transcription!.summaryKey!, {
                level: "private",
                download: true,
              }).then((output: any) => (output.Body as Blob).text()),
            )
            .catch((e) => {
              handleLogout().then();
              throw e;
            })
        : undefined;
    },
  });

  useEffect(() => {
    if (data) {
      setTranscription(data);
    }
  }, [data]);

  useEffect(() => {
    if (summaryResponse) {
      setSummary(summaryResponse);
    }
  }, [summaryResponse]);

  return {
    transcription,
    summary,
    isTranscribeCompleted,
    isPipelineCompleted,
  };
};
