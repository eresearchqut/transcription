import { useEffect, useState } from "react";
import {
  Transcription,
  transcriptionJobStatus,
  TranscriptionJobStatus,
} from "../model";
import { useQuery } from "@tanstack/react-query";
import { getter } from "../client/fetchers";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseTranscriptionProps {
  jobId: string;
  transcription?: Transcription;
}

export interface UseTranscriptionState {
  transcription?: Transcription;
}

export const useTranscription = ({
  jobId,
  transcription: initialTranscription,
}: UseTranscriptionProps): UseTranscriptionState => {
  const [transcription, setTranscription] = useState<Transcription | undefined>(
    initialTranscription,
  );

  const jobFinished =
    transcription &&
    [TranscriptionJobStatus.FAILED, TranscriptionJobStatus.COMPLETED].includes(
      transcriptionJobStatus(transcription) as TranscriptionJobStatus,
    );

  const { data } = useQuery({
    enabled: !jobFinished,
    queryKey: ["transcription", jobId],
    queryFn: async (): Promise<Transcription> =>
      getter({
        apiUrl: API_ENDPOINT,
        resource: "transcription",
        id: jobId,
      }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data) {
      setTranscription(data);
    }
  }, [data]);

  return {
    transcription,
  };
};
