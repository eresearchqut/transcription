import * as React from "react";
import { FunctionComponent } from "react";
import { Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { lowerCase } from "lodash";
import { TranscriptionDownloadOptions } from "../transcriptionDownloadOptions/transcriptionDownloadOptions";
import { mapTranscriptionStatus, TranscriptionJobStatus } from "../../model";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { ProgressBar, ProgressLabel, ProgressRoot } from "../ui/progress";
import { MappedIcon } from "../mappedIcon";
import { Alert } from "../ui/alert";

export interface TranscriptionJobProgress {
  status?: TranscriptionJobStatus;
}

export interface FileTranscriptionProgressProps
  extends Pick<UseTranscriptionProps, "jobId"> {
  filename: string;
  uploadProgress: number;
  onPlayClick: (mediaUrl: string, transcriptUrl: string) => void;
}

const isCompleted = (progress: number) => progress === 100;

const UploadProgressStatus = ({
  progress,
  processingText,
  completedText,
}: {
  progress: number;
  processingText: string;
  completedText: string;
}) => {
  return progress < 100 ? (
    <ProgressRoot width={"full"} striped value={progress}>
      <ProgressLabel>{processingText}</ProgressLabel>
      <ProgressBar />
    </ProgressRoot>
  ) : (
    <Text>
      <MappedIcon icon={"check-circle"} color={"green.600"} mr={2} mb={1} />
      {completedText}
    </Text>
  );
};

const TranscriptionProgressStatus = ({ status }: TranscriptionJobProgress) => {
  const iconProps = { mr: 2, mb: 1 };
  return (
    <Text as={"div"}>
      {status === TranscriptionJobStatus.IN_PROGRESS ? (
        <Spinner mr={2} size={"sm"} />
      ) : status === TranscriptionJobStatus.COMPLETED ? (
        <MappedIcon icon={"check-circle"} {...iconProps} color={"green.600"} />
      ) : status === TranscriptionJobStatus.FAILED ? (
        <MappedIcon
          icon={"exclamation-circle"}
          {...iconProps}
          color={"red.600"}
        />
      ) : (
        <MappedIcon icon={"clock"} {...iconProps} color={"yellow.600"} />
      )}
      {`Transcription ${lowerCase((status ?? "PENDING")?.split("_").join(" "))}`}
      {![TranscriptionJobStatus.COMPLETED, TranscriptionJobStatus.FAILED].find(
        (s) => s === status,
      ) && "..."}
    </Text>
  );
};

export const TranscriptionProgress: FunctionComponent<
  FileTranscriptionProgressProps
> = ({ jobId, filename, uploadProgress, onPlayClick }) => {
  const { transcription } = useTranscription({ jobId });
  const transcriptionStatus = mapTranscriptionStatus(transcription);

  return (
    <Alert
      key={filename}
      title={
        <Text pl={2} fontSize={"lg"}>
          {filename}
        </Text>
      }
      status={
        transcriptionStatus === TranscriptionJobStatus.COMPLETED
          ? "success"
          : transcriptionStatus === TranscriptionJobStatus.FAILED
            ? "error"
            : "info"
      }
      icon={
        <MappedIcon
          boxSize={[10, 12]}
          my={"auto"}
          icon={
            transcriptionStatus === TranscriptionJobStatus.COMPLETED
              ? "file-check"
              : transcriptionStatus === TranscriptionJobStatus.FAILED
                ? "file-alert"
                : "file"
          }
        />
      }
    >
      <Stack
        direction={{ base: "column", sm: "row" }}
        pl={2}
        justifyContent={{ sm: "space-between" }}
      >
        <VStack align={"flex-start"} gap={0} flexGrow={2}>
          <UploadProgressStatus
            progress={uploadProgress}
            processingText={"Uploading..."}
            completedText={"Upload successful"}
          />
          {isCompleted(uploadProgress) && (
            <TranscriptionProgressStatus status={transcriptionStatus} />
          )}
        </VStack>
        {transcriptionStatus === TranscriptionJobStatus.COMPLETED &&
          transcription && (
            <TranscriptionDownloadOptions
              initialTranscription={transcription}
              handlePlayClick={onPlayClick}
            />
          )}
      </Stack>
    </Alert>
  );
};

export default TranscriptionProgress;
