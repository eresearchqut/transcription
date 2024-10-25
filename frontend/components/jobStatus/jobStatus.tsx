import * as React from "react";
import { FunctionComponent, useEffect, useState } from "react";
import {
  Transcription,
  transcriptionJobStatus,
  TranscriptionJobStatus,
} from "../../model";
import { Tag } from "@chakra-ui/tag";
import { isUndefined } from "lodash";
import { Spinner } from "@chakra-ui/react";
import { useTranscription } from "../../hooks/useTranscription";

export interface JobStatusProps {
  jobId: string;
  transcription?: Transcription;
}

const formatStatus = (status: string) =>
  (status ?? "PENDING")?.split("_").join(" ");

const JobStatus: FunctionComponent<JobStatusProps> = ({
  jobId,
  transcription: initialTranscription,
}) => {
  const { transcription } = useTranscription({
    jobId,
    transcription: initialTranscription,
  });
  const [status, setStatus] = useState(
    transcription
      ? transcriptionJobStatus(transcription as Transcription)
      : "Pending",
  );

  useEffect(() => {
    if (transcription) {
      setStatus(transcriptionJobStatus(transcription));
    }
  }, [transcription]);

  const colorScheme =
    status === TranscriptionJobStatus.FAILED
      ? "red"
      : status === TranscriptionJobStatus.COMPLETED
        ? "green"
        : "yellow";

  return (
    <Tag colorScheme={colorScheme}>
      {isUndefined(status) ||
        (status === TranscriptionJobStatus.IN_PROGRESS && (
          <Spinner size={"sm"} mr={1} />
        ))}
      {status && formatStatus(status)}
    </Tag>
  );
};

export default JobStatus;
