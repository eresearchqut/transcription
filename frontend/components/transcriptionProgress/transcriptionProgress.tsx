import * as React from "react";
import { Fragment, FunctionComponent } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Progress,
  Spacer,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { Box, Stack } from "@chakra-ui/layout";
import { CheckCircleIcon, TimeIcon, WarningIcon } from "@chakra-ui/icons";
import { lowerCase } from "lodash";
import { TbFile, TbFileAlert, TbFileCheck } from "react-icons/tb";
import { TranscriptionDownloadOptions } from "../TranscriptionDownloadOptions/transcriptionDownloadOptions";
import { mapTranscriptionStatus, TranscriptionJobStatus } from "../../model";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";

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
    <Text as={"div"}>
      {processingText}
      <Progress hasStripe value={progress} />
    </Text>
  ) : (
    <Text>
      <CheckCircleIcon color={"green.600"} mr={2} mb={1} />
      {completedText}
    </Text>
  );
};

const TranscriptionProgressStatus = ({ status }: TranscriptionJobProgress) => {
  const iconProps = { mr: 2, mb: 1 };
  return (
    <Text>
      {status === TranscriptionJobStatus.IN_PROGRESS ? (
        <Spinner mr={2} size={"sm"} />
      ) : status === TranscriptionJobStatus.COMPLETED ? (
        <CheckCircleIcon {...iconProps} color={"green.600"} />
      ) : status === TranscriptionJobStatus.FAILED ? (
        <WarningIcon {...iconProps} color={"red.600"} />
      ) : (
        <TimeIcon {...iconProps} color={"yellow.600"} />
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
      status={
        transcriptionStatus === TranscriptionJobStatus.COMPLETED
          ? "success"
          : transcriptionStatus === TranscriptionJobStatus.FAILED
            ? "error"
            : "info"
      }
      variant="left-accent"
    >
      <AlertIcon
        as={
          transcriptionStatus === TranscriptionJobStatus.COMPLETED
            ? TbFileCheck
            : transcriptionStatus === TranscriptionJobStatus.FAILED
              ? TbFileAlert
              : TbFile
        }
        boxSize={[10, 12]}
      />
      <Box width={"95%"}>
        <AlertTitle>{filename}</AlertTitle>
        <AlertDescription>
          <UploadProgressStatus
            progress={uploadProgress}
            processingText={"Uploading..."}
            completedText={"Upload successful"}
          />
          {isCompleted(uploadProgress) && (
            <TranscriptionProgressStatus status={transcriptionStatus} />
          )}
        </AlertDescription>
      </Box>
      {transcriptionStatus === TranscriptionJobStatus.COMPLETED &&
        transcription && (
          <Fragment>
            <Spacer />
            <Stack spacing={4} direction={"row"} align={"center"}>
              <TranscriptionDownloadOptions
                transcription={transcription}
                onPlayClick={onPlayClick}
              />
            </Stack>
          </Fragment>
        )}
    </Alert>
  );
};

export default TranscriptionProgress;
