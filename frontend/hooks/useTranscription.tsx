import { useEffect, useState } from "react";
import {
  Transcription,
  mapTranscriptionStatus,
  TranscriptionJobStatus,
} from "../model";
import { useQuery } from "@tanstack/react-query";
import { getter } from "../client/fetchers";
import { isDefined } from "@chakra-ui/utils";
import { isEmpty } from "lodash";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseTranscriptionProps {
  jobId: string;
  transcription?: Transcription;
}

export interface UseTranscriptionState {
  transcription?: Transcription;
  isJobFinished: boolean;
}

export const useTranscription = ({
  jobId,
  transcription: initialTranscription,
}: UseTranscriptionProps): UseTranscriptionState => {
  const [transcription, setTranscription] = useState<Transcription | undefined>(
    initialTranscription,
  );

  const currentStatus = mapTranscriptionStatus(transcription);
  const isJobFinished: boolean = transcription
    ? !isEmpty(transcription.downloadKey) &&
      isDefined(currentStatus) &&
      [
        TranscriptionJobStatus.FAILED,
        TranscriptionJobStatus.COMPLETED,
      ].includes(currentStatus!)
    : false;

  const { data } = useQuery({
    enabled: !isJobFinished,
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
    isJobFinished,
  };
};
