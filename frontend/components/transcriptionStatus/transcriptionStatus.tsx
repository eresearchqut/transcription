import { Badge, Spinner } from "@chakra-ui/react";
import {
  isTranslationFailed,
  mapTranscriptionStatus,
  TranscriptionJobStatus as Status,
  type Transcription,
} from "model";
import type { FunctionComponent } from "react";
import {
  type UseTranscriptionProps,
  useTranscription,
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
    // Keep showing IN_PROGRESS while summarisation/translation are still running.
    if (rawStatus === Status.COMPLETED && !isPipelineCompleted)
      return Status.IN_PROGRESS;
    // Transcribe succeeded but a post-processing step failed — show as failed.
    if (
      rawStatus === Status.COMPLETED &&
      isPipelineCompleted &&
      isTranslationFailed(transcription)
    )
      return Status.FAILED;
    return rawStatus;
  };

  const status = displayStatus(transcription);

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
