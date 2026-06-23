"use client";

import { FunctionComponent, ReactNode, useState } from "react";
import NextLink from "next/link";
import { Box, Button, Group, Stack, Text, VStack } from "@chakra-ui/react";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import { TRANSCRIBE_QUOTAS } from "model";
import {
  TranscribeProps,
  TranscriptionOptions,
  TranscriptionOptionsValue,
} from "./transcriptionOptions";
import { OptionsSummary } from "./optionsSummary";
import { supportedFileFormatsText } from "@/components/quotas/quotas";
import {
  StepsContent,
  StepsItem,
  StepsList,
  StepsRoot,
} from "@/components/ui/steps";
import { MappedIcon } from "@/components/mappedIcon";

export type { TranscribeProps };

const DEFAULT_OPTIONS: TranscriptionOptionsValue = {
  props: {
    languages: ["en-AU"],
    enablePiiRedaction: false,
    generateSummary: true,
    targetLanguage: undefined,
  },
  valid: true,
};

export interface MediaUploadProps {
  onSubmit: (transcribeProps: TranscribeProps, files: File[]) => void;
  identityId?: string;
  uploadsComplete?: boolean;
  onClearUploads?: () => void;
  children?: ReactNode;
}

export const MediaUpload: FunctionComponent<MediaUploadProps> = ({
  onSubmit,
  identityId,
  uploadsComplete = false,
  onClearUploads,
  children,
}) => {
  const [step, setStep] = useState<number>(0);
  const [filePickerKey, setFilePickerKey] = useState<number>(0);
  const [uploadStarted, setUploadStarted] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [optionsValue, setOptionsValue] =
    useState<TranscriptionOptionsValue>(DEFAULT_OPTIONS);

  const onFilesPicked = (files: File[]) => {
    onSubmit(optionsValue.props, files);
    setUploadStarted(true);
    setSelectedFiles([]);
    setFilePickerKey((key) => key + 1);
    setStep(3);
  };

  const onUploadMore = () => {
    onClearUploads?.();
    setUploadStarted(false);
    setSelectedFiles([]);
    setFilePickerKey((key) => key + 1);
    setStep(1);
  };

  const onStartAgain = () => {
    onClearUploads?.();
    setUploadStarted(false);
    setSelectedFiles([]);
    setOptionsValue(DEFAULT_OPTIONS);
    setFilePickerKey((key) => key + 1);
    setStep(0);
  };

  const isStepValid = (index: number) => {
    switch (index) {
      case 1:
        return optionsValue.valid;
      case 2:
        return uploadStarted;
      default:
        return true;
    }
  };

  const {
    accept,
    maximumFileSizeBytes,
    maximumFilesCount,
    supportedFileFormats,
  } = TRANSCRIBE_QUOTAS;

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
      linear
      isStepValid={isStepValid}
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
          <Group justifyContent={"space-between"} alignItems={"center"}>
            <Button colorPalette={"gray"} variant={"solid"} asChild>
              <NextLink href={"/classic"}>Revert to classic view</NextLink>
            </Button>
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
          <OptionsSummary options={optionsValue.props} />
          <FilePicker
            key={filePickerKey}
            {...filePickerProps}
            disabled={!optionsValue.valid}
            onSelectionChange={setSelectedFiles}
            hideUploadButton
            description={
              <>
                Select the audio or video files you want to transcribe. You can
                choose multiple files at once, or drag and drop several files
                together. {supportedFileFormatsText(supportedFileFormats)}
              </>
            }
          />
          <Group justifyContent={"space-between"}>
            <Button variant={"outline"} onClick={() => setStep(1)}>
              <MappedIcon icon={"chevron-left"} size={"xs"} />
              Back
            </Button>
            <Button
              colorPalette={"blue"}
              disabled={!optionsValue.valid || selectedFiles.length === 0}
              onClick={() => onFilesPicked(selectedFiles)}
            >
              Upload
              <MappedIcon icon={"upload"} size={"xs"} />
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      <StepsContent index={3}>
        <VStack align={"stretch"} gap={4} pt={4}>
          <OptionsSummary options={optionsValue.props} />
          {children ?? (
            <Box>
              <Text>
                Your files are uploading. Track their progress here once the
                upload completes.
              </Text>
            </Box>
          )}
          <Group justifyContent={"space-between"}>
            <Group>
              <Button
                variant={"outline"}
                disabled={!uploadsComplete}
                onClick={onUploadMore}
              >
                Upload more files
              </Button>
              <Button
                variant={"outline"}
                disabled={!uploadsComplete}
                onClick={onStartAgain}
              >
                Start again
              </Button>
            </Group>
            <Button colorPalette={"blue"} disabled={!uploadsComplete} asChild>
              {uploadsComplete ? (
                <NextLink href={"/transcriptions"}>
                  View transcriptions
                </NextLink>
              ) : (
                <span>View transcriptions</span>
              )}
            </Button>
          </Group>
        </VStack>
      </StepsContent>
    </StepsRoot>
  );
};

export default MediaUpload;
