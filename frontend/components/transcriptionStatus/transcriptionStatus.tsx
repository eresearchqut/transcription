import * as React from "react";
import { FunctionComponent, useEffect, useState } from "react";
import {
  Transcription,
  mapTranscriptionStatus,
  TranscriptionJobStatus as Status,
} from "model";
import { Badge, Spinner } from "@chakra-ui/react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";

const formatStatus = (status: string) =>
  (status ?? "PENDING")?.split("_").join(" ");

const TranscriptionStatus: FunctionComponent<UseTranscriptionProps> = ({
  jobId,
  initialTranscription,
}) => {
  const { transcription, isPipelineCompleted } = useTranscription({
    jobId,
    initialTranscription,
  });

  const displayStatus = (transcription?: Transcription): Status | "Pending" => {
    if (!transcription) return "Pending";
    const rawStatus = mapTranscriptionStatus(transcription);
    // The transcribe job can be COMPLETED while summarisation/translation are
    // still running. Keep showing IN_PROGRESS until the whole pipeline is done.
    return rawStatus === Status.COMPLETED && !isPipelineCompleted
      ? Status.IN_PROGRESS
      : rawStatus;
  };

  const [status, setStatus] = useState(displayStatus(transcription));

  useEffect(() => {
    setStatus(displayStatus(transcription));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription, isPipelineCompleted]);

  const colorPalette =
    status === Status.FAILED
      ? "red"
      : status === Status.COMPLETED
        ? "green"
        : "yellow";

  const inProgress = status === Status.IN_PROGRESS;
  const statusLabel = formatStatus(status ?? "PENDING");

  return (
    <Badge
      colorPalette={colorPalette}
      minW={"max-content"}
      variant={"surface"}
      whiteSpace={"nowrap"}
    >
      {inProgress && (
        <Spinner boxSize={3} color={"currentColor"} display={"block"} />
      )}
      {statusLabel}
    </Badge>
  );
};

export default TranscriptionStatus;
