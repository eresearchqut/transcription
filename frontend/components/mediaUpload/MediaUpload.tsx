"use client";

import { FunctionComponent, ReactNode, useState } from "react";
import { Box, Button, Group, Stack, Text, VStack } from "@chakra-ui/react";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import { TRANSCRIBE_QUOTAS } from "model";
import {
  TranscribeProps,
  TranscriptionOptions,
  TranscriptionOptionsValue,
} from "./transcriptionOptions";
import {
  StepsContent,
  StepsItem,
  StepsList,
  StepsRoot,
} from "@/components/ui/steps";
import { MappedIcon } from "@/components/mappedIcon";

export type { TranscribeProps };

export interface MediaUploadProps {
  onSubmit: (transcribeProps: TranscribeProps, files: File[]) => void;
  identityId?: string;
  children?: ReactNode;
}

export const MediaUpload: FunctionComponent<MediaUploadProps> = ({
  onSubmit,
  identityId,
  children,
}) => {
  const [step, setStep] = useState<number>(0);
  const [optionsValue, setOptionsValue] = useState<TranscriptionOptionsValue>({
    props: {
      languages: ["en-AU"],
      enablePiiRedaction: false,
      generateSummary: true,
      targetLanguage: undefined,
    },
    valid: true,
  });

  const onFilesPicked = (files: File[]) => {
    onSubmit(optionsValue.props, files);
    setStep(3);
  };

  const { accept, maximumFileSizeBytes, maximumFilesCount } = TRANSCRIBE_QUOTAS;

  const filePickerProps: FilePickerProps = {
    accept,
    maxFiles: maximumFilesCount,
    maxSize: maximumFileSizeBytes,
    onFilesPicked,
  };

  return (
    <StepsRoot
      step={step}
      onStepChange={(details) => setStep(details.step)}
      count={4}
      colorPalette={"blue"}
    >
      <StepsList>
        <StepsItem index={0} title={"Overview"} />
        <StepsItem index={1} title={"Choose options"} />
        <StepsItem index={2} title={"Upload files"} />
        <StepsItem index={3} title={"Track progress"} />
      </StepsList>

      <StepsContent index={0}>
        <VStack align={"stretch"} gap={4} pt={4}>
          <Box>
            <Text mb={3}>
              This service transcribes your audio and video files into text. You
              can optionally translate the transcript into another language,
              redact personally identifiable information, and generate an
              AI-powered summary.
            </Text>
            <Text mb={2} fontWeight={"medium"}>
              To get started:
            </Text>
            <Stack as={"ol"} gap={1} pl={5} listStyleType={"decimal"}>
              <Text as={"li"}>
                Choose the transcription options that suit your media.
              </Text>
              <Text as={"li"}>Upload one or more audio or video files.</Text>
              <Text as={"li"}>
                Track the progress of your transcriptions and download the
                results once they are ready.
              </Text>
            </Stack>
          </Box>
          <Group justifyContent={"flex-end"}>
            <Button colorPalette={"blue"} onClick={() => setStep(1)}>
              Get started
              <MappedIcon icon={"chevron-right"} size={"xs"} />
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      <StepsContent index={1}>
        <VStack align={"stretch"} gap={4} pt={4}>
          <TranscriptionOptions
            identityId={identityId}
            onChange={setOptionsValue}
            direction={{ base: "column" }}
          />
          <Group justifyContent={"space-between"}>
            <Button variant={"outline"} onClick={() => setStep(0)}>
              <MappedIcon icon={"chevron-left"} size={"xs"} />
              Back
            </Button>
            <Button
              colorPalette={"blue"}
              disabled={!optionsValue.valid}
              onClick={() => setStep(2)}
            >
              Next
              <MappedIcon icon={"chevron-right"} size={"xs"} />
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      <StepsContent index={2}>
        <VStack align={"stretch"} gap={4} pt={4}>
          <FilePicker {...filePickerProps} disabled={!optionsValue.valid} />
          <Group justifyContent={"flex-start"}>
            <Button variant={"outline"} onClick={() => setStep(1)}>
              <MappedIcon icon={"chevron-left"} size={"xs"} />
              Back
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      <StepsContent index={3}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {children ?? (
            <Box>
              <Text>
                Your files are uploading. Track their progress here once the
                upload completes.
              </Text>
            </Box>
          )}
          <Group justifyContent={"flex-start"}>
            <Button variant={"outline"} onClick={() => setStep(1)}>
              Upload more files
            </Button>
          </Group>
        </VStack>
      </StepsContent>
    </StepsRoot>
  );
};

export default MediaUpload;
