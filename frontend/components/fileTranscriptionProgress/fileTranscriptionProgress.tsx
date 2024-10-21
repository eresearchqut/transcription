import * as React from "react";
import { Fragment, FunctionComponent } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Progress,
  Spacer,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { TbFile } from "react-icons/tb";
import { Box, Stack } from "@chakra-ui/layout";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  TimeIcon,
  WarningIcon,
} from "@chakra-ui/icons";
import { AiOutlinePlaySquare } from "react-icons/ai";
import { lowerCase } from "lodash";

export type TranscriptionJobStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "FAILED"
  | "COMPLETED";

export enum TranscriptionJobStatusE {
  QUEUED = "QUEUED",
  IN_PROGRESS = "IN_PROGRESS",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
}

export interface TranscriptionJobProgress {
  status?: TranscriptionJobStatus;
}

export interface FileTranscriptionProgressProps {
  filename: string;
  uploadProgress: number;
  transcriptionProgress: TranscriptionJobProgress | undefined;
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
    <Text>
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
      {status === TranscriptionJobStatusE.IN_PROGRESS ? (
        <Spinner mr={2} size={"sm"} />
      ) : status === TranscriptionJobStatusE.COMPLETED ? (
        <CheckCircleIcon {...iconProps} color={"green.600"} />
      ) : status === TranscriptionJobStatusE.FAILED ? (
        <WarningIcon {...iconProps} color={"red.600"} />
      ) : (
        <TimeIcon {...iconProps} color={"yellow.600"} />
      )}
      {`Transcription ${lowerCase((status ?? "PENDING")?.split("_").join(" "))}`}
      {![
        TranscriptionJobStatusE.COMPLETED,
        TranscriptionJobStatusE.FAILED,
      ].find((s) => s === status) && "..."}
    </Text>
  );
};

export const FileTranscriptionProgress: FunctionComponent<
  FileTranscriptionProgressProps
> = ({ filename, uploadProgress, transcriptionProgress }) => {
  const { status } = transcriptionProgress ?? {};

  return (
    <Alert key={filename} status={"info"} variant="left-accent">
      <AlertIcon as={TbFile} boxSize={[10, 12]} />
      <Box width={"95%"}>
        <AlertTitle>{filename}</AlertTitle>
        <AlertDescription>
          <UploadProgressStatus
            progress={uploadProgress}
            processingText={"Uploading..."}
            completedText={"Upload successful"}
          />
          {isCompleted(uploadProgress) && (
            <TranscriptionProgressStatus status={status} />
          )}
        </AlertDescription>
      </Box>
      {status === TranscriptionJobStatusE.COMPLETED && (
        <Fragment>
          <Spacer />
          <Stack spacing={4} direction={"row"} align={"center"}>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                Download
              </MenuButton>
              <Portal>
                <MenuList>
                  <MenuItem>Media</MenuItem>
                  <MenuItem>JSON</MenuItem>
                  <MenuItem>SRT</MenuItem>
                  <MenuItem>VTT</MenuItem>
                  <MenuItem>DOCX</MenuItem>
                </MenuList>
              </Portal>
            </Menu>
            <Button variant={"outline"} leftIcon={<AiOutlinePlaySquare />}>
              Play
            </Button>
          </Stack>
        </Fragment>
      )}
    </Alert>
  );
};

export default FileTranscriptionProgress;
