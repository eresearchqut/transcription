"use client";

import {
  Box,
  Button,
  Group,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TRANSCRIBE_QUOTAS } from "model";
import NextLink from "next/link";
import { type FunctionComponent, type ReactNode, useState } from "react";
import { MappedIcon } from "@/components/mappedIcon";
import { supportedFileFormatsText } from "@/components/quotas/quotas";
import {
  StepsContent,
  StepsItem,
  StepsList,
  StepsRoot,
} from "@/components/ui/steps";
import { FilePicker, type FilePickerProps } from "../../inputs/filePicker";
import { OptionsSummary } from "./optionsSummary";
import {
  type TranscribeProps,
  TranscriptionOptions,
  type TranscriptionOptionsValue,
} from "./transcriptionOptions";

export type { TranscribeProps };

const STEP_TITLES = [
  "Overview",
  "Choose options",
  "Choose files",
  "Track progress",
];

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

  const stepHeading = (index: number) => (
    <Heading as={"h2"} size={"lg"} hideFrom={"md"}>
      {STEP_TITLES[index]}
    </Heading>
  );

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
        <StepsItem index={0} title={STEP_TITLES[0]} />
        <StepsItem index={1} title={STEP_TITLES[1]} />
        <StepsItem index={2} title={STEP_TITLES[2]} />
        <StepsItem index={3} title={STEP_TITLES[3]} />
      </StepsList>

      <StepsContent index={0}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {stepHeading(0)}
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
          <Group
            justifyContent={"space-between"}
            alignItems={"center"}
            flexWrap={"wrap"}
            gap={3}
          >
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
          {stepHeading(1)}
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
          {stepHeading(2)}
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
          {stepHeading(3)}
          <OptionsSummary options={optionsValue.props} />
          {children ?? (
            <Box>
              <Text>
                Your files are uploading. Track their progress here once the
                upload completes.
              </Text>
            </Box>
          )}
          <Group justifyContent={"space-between"} flexWrap={"wrap"} gap={3}>
            <Group flexWrap={"wrap"} gap={3}>
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
