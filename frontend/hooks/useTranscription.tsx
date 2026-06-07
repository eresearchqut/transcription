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
import { useAuth } from "../context/auth-context";
import { downloadData } from "aws-amplify/storage";

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
  isTranscribeFailed: boolean;
  isPipelineCompleted: boolean;
}

export const useTranscription = ({
  jobId,
  initialTranscription,
}: UseTranscriptionProps): UseTranscriptionState => {
  const { getCurrentSession } = useAuth();
  const [transcription, setTranscription] = useState<Transcription | undefined>(
    initialTranscription,
  );
  const [summary, setSummary] = useState<string | undefined>();

  const currentStatus = mapTranscriptionStatus(transcription);
  const isTranscribeCompleted: boolean = transcription
    ? !isEmpty(transcription.downloadKey) &&
      !isUndefined(currentStatus) &&
      currentStatus === TranscriptionJobStatus.COMPLETED
    : false;

  const isTranscribeFailed: boolean =
    currentStatus === TranscriptionJobStatus.FAILED;
  const isPipelineCompleted: boolean =
    isTranscribeFailed ||
    (!isUndefined(transcription) &&
      isTranscribeCompleted &&
      (enableGenerateSummary(transcription)
        ? !isEmpty(transcription?.summaryKey)
        : true));
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
        ? getCurrentSession()
            .then(() => {
              const summaryKey = transcription!.summaryKey!;
              const path: string | (({ identityId }: { identityId?: string }) => string) =
                summaryKey.startsWith("users/")
                  ? summaryKey
                  : ({ identityId }) => `private/${identityId}/${summaryKey}`;
              return downloadData({ path });
            })
            .then((downloadDataOutput) => downloadDataOutput.result)
            .then((downloadDataOutputResult) =>
              downloadDataOutputResult.body.text(),
            )
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
    isTranscribeFailed,
    isPipelineCompleted,
  };
};
