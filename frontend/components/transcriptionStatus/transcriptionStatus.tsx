import * as React from "react";
import { FunctionComponent, useEffect, useState } from "react";
import {
  Transcription,
  mapTranscriptionStatus,
  TranscriptionJobStatus as Status,
} from "model";
import { isUndefined } from "lodash";
import { Spinner } from "@chakra-ui/react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { Tag } from "../ui/tag";

const formatStatus = (status: string) =>
  (status ?? "PENDING")?.split("_").join(" ");

const TranscriptionStatus: FunctionComponent<UseTranscriptionProps> = ({
  jobId,
  initialTranscription,
}) => {
  const { transcription } = useTranscription({
    jobId,
    initialTranscription,
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

  const colorPalette =
    status === Status.FAILED
      ? "red"
      : status === Status.COMPLETED
        ? "green"
        : "yellow";

  return (
    <Tag colorPalette={colorPalette}>
      {isUndefined(status) ||
        (status === Status.IN_PROGRESS && <Spinner size={"sm"} mr={1} />)}
      {status && formatStatus(status)}
    </Tag>
  );
};

export default TranscriptionStatus;
