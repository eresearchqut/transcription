import * as React from "react";
import { FunctionComponent, useEffect, useState } from "react";
import {
  Transcription,
  mapTranscriptionStatus,
  TranscriptionJobStatus as Status,
} from "../../model";
import { Tag } from "@chakra-ui/tag";
import { isUndefined } from "lodash";
import { Spinner } from "@chakra-ui/react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";

const formatStatus = (status: string) =>
  (status ?? "PENDING")?.split("_").join(" ");

const TranscriptionStatus: FunctionComponent<UseTranscriptionProps> = ({
  jobId,
  transcription: initialTranscription,
}) => {
  const { transcription } = useTranscription({
    jobId,
    transcription: initialTranscription,
  });
  const [status, setStatus] = useState(
    transcription
      ? mapTranscriptionStatus(transcription as Transcription)
      : "Pending",
  );

  useEffect(() => {
    if (transcription) {
      setStatus(mapTranscriptionStatus(transcription));
    }
  }, [transcription]);

  const colorScheme =
    status === Status.FAILED
      ? "red"
      : status === Status.COMPLETED
        ? "green"
        : "yellow";

  return (
    <Tag colorScheme={colorScheme}>
      {isUndefined(status) ||
        (status === Status.IN_PROGRESS && <Spinner size={"sm"} mr={1} />)}
      {status && formatStatus(status)}
    </Tag>
  );
};

export default TranscriptionStatus;
