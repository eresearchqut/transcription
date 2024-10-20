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
  Text,
} from "@chakra-ui/react";
import { TbFile } from "react-icons/tb";
import { Box, Stack } from "@chakra-ui/layout";
import { CheckCircleIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { AiOutlinePlaySquare } from "react-icons/ai";

export interface FileTranscriptionProgressProps {
  filename: string;
  uploadProgress: number;
  transcriptionProgress: number;
}

const isCompleted = (progress: number) => progress === 100;

const ProgressStatus = ({
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

export const FileTranscriptionProgress: FunctionComponent<
  FileTranscriptionProgressProps
> = ({ filename, uploadProgress, transcriptionProgress }) => {
  return (
    <Alert key={filename} status={"info"} variant="left-accent">
      <AlertIcon as={TbFile} boxSize={[10, 12]} />
      <Box width={"95%"}>
        <AlertTitle>{filename}</AlertTitle>
        <AlertDescription>
          <ProgressStatus
            progress={uploadProgress}
            processingText={"Uploading..."}
            completedText={"Upload successful"}
          />
          {isCompleted(uploadProgress) && (
            <ProgressStatus
              progress={transcriptionProgress}
              processingText={"Transcribing..."}
              completedText={"Transcription completed"}
            />
          )}
        </AlertDescription>
      </Box>
      {isCompleted(transcriptionProgress) && (
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
