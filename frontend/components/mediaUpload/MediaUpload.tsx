"use client";

import {
  Box,
  Button,
  Group,
  Heading,
  Span,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TRANSCRIBE_QUOTAS } from "model";
import NextLink from "next/link";
import { type FunctionComponent, type ReactNode, useId, useState } from "react";
import { MappedIcon } from "@/components/mappedIcon";
import { supportedFileFormatsText } from "@/components/quotas/quotas";
import {
  StepsContent,
  StepsItem,
  StepsList,
  StepsRoot,
} from "@/components/ui/steps";
import { useFeatures } from "../../hooks/useFeatures";
import { FilePicker, type FilePickerProps } from "../../inputs/filePicker";
import { OptionsSummary } from "./optionsSummary";
import {
  ResearchPlanOptions,
  type ResearchPlanValue,
} from "./researchPlanOptions";
import {
  type TranscribeProps,
  TranscriptionOptions,
  type TranscriptionOptionsValue,
} from "./transcriptionOptions";

export type { TranscribeProps };

type StepKey = "overview" | "plan" | "options" | "files" | "progress";

const STEP_TITLES: Record<StepKey, string> = {
  overview: "Overview",
  plan: "Choose plan",
  options: "Choose options",
  files: "Choose files",
  progress: "Track progress",
};

const DEFAULT_PLAN: ResearchPlanValue = {
  rpid: undefined,
  valid: false,
  problems: [],
};

const DEFAULT_OPTIONS: TranscriptionOptionsValue = {
  props: {
    languages: ["en-AU"],
    enablePiiRedaction: false,
    generateSummary: true,
    targetLanguage: undefined,
  },
  valid: false,
  problems: [],
};

const RequiredFieldsNote = () => (
  <Text fontSize={"sm"} color={"fg.muted"}>
    Fields marked{" "}
    <Span color={"fg.error"} fontWeight={"bold"}>
      *
    </Span>{" "}
    are required.
  </Text>
);

interface StepActionsProps {
  value: { valid: boolean; problems: string[] };
  onBack: () => void;
  onNext: () => void;
}

const StepActions: FunctionComponent<StepActionsProps> = ({
  value: { valid, problems },
  onBack,
  onNext,
}) => {
  const problemsId = useId();
  return (
    <Group justifyContent={"space-between"} alignItems={"flex-start"}>
      <Button variant={"outline"} onClick={onBack}>
        <MappedIcon icon={"chevron-left"} size={"xs"} />
        Back
      </Button>
      <Stack
        direction={{ base: "column", sm: "row" }}
        align={{ base: "flex-end", sm: "center" }}
        gap={{ base: 2, sm: 4 }}
      >
        {!valid && (
          <Stack
            id={problemsId}
            gap={0}
            fontSize={"sm"}
            color={"fg.muted"}
            textAlign={"end"}
          >
            {problems.map((problem) => (
              <Text key={problem}>{problem}</Text>
            ))}
          </Stack>
        )}
        {/* aria-disabled rather than disabled keeps the button focusable,
            so screen reader users can reach it and hear why it's unavailable. */}
        <Button
          colorPalette={"blue"}
          aria-disabled={!valid}
          aria-describedby={valid ? undefined : problemsId}
          onClick={() => valid && onNext()}
        >
          Next
          <MappedIcon icon={"chevron-right"} size={"xs"} />
        </Button>
      </Stack>
    </Group>
  );
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
  const [optionsKey, setOptionsKey] = useState<number>(0);
  const [uploadStarted, setUploadStarted] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [planValue, setPlanValue] = useState<ResearchPlanValue>(DEFAULT_PLAN);
  const [optionsValue, setOptionsValue] =
    useState<TranscriptionOptionsValue>(DEFAULT_OPTIONS);

  const { features, isLoading: featuresLoading } = useFeatures();
  const rpidRequired = !!features?.rpid;
  const steps: StepKey[] = [
    "overview",
    ...(rpidRequired ? (["plan"] as const) : []),
    "options",
    "files",
    "progress",
  ];
  const goTo = (key: StepKey) => setStep(steps.indexOf(key));

  const transcribeProps: TranscribeProps = {
    ...optionsValue.props,
    rpid: rpidRequired ? planValue.rpid : undefined,
  };
  const valid = optionsValue.valid && (!rpidRequired || planValue.valid);

  const onFilesPicked = (files: File[]) => {
    onSubmit(transcribeProps, files);
    setUploadStarted(true);
    setSelectedFiles([]);
    setFilePickerKey((key) => key + 1);
    goTo("progress");
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
    setPlanValue(DEFAULT_PLAN);
    setOptionsValue(DEFAULT_OPTIONS);
    setOptionsKey((key) => key + 1);
    setFilePickerKey((key) => key + 1);
    goTo("overview");
  };

  const isStepValid = (index: number) => {
    switch (steps[index]) {
      case "plan":
        return planValue.valid;
      case "options":
        return optionsValue.valid;
      case "files":
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

  const stepHeading = (key: StepKey) => (
    <Heading as={"h2"} size={"lg"} hideFrom={"md"}>
      {STEP_TITLES[key]}
    </Heading>
  );

  return (
    <StepsRoot
      step={step}
      onStepChange={(details) => setStep(details.step)}
      count={steps.length}
      linear
      isStepValid={isStepValid}
      colorPalette={"blue"}
    >
      <StepsList>
        {steps.map((key, index) => (
          <StepsItem key={key} index={index} title={STEP_TITLES[key]} />
        ))}
      </StepsList>

      <StepsContent index={steps.indexOf("overview")}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {stepHeading("overview")}
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
              {rpidRequired && (
                <Text as={"li"}>
                  Choose the data management plan your media belongs to.
                </Text>
              )}
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
            {/* Wait for the feature flags, which decide whether there is a plan step. */}
            <Button
              colorPalette={"blue"}
              loading={featuresLoading}
              loadingText={"Get started"}
              onClick={() => setStep(1)}
            >
              Get started
              <MappedIcon icon={"chevron-right"} size={"xs"} />
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      {rpidRequired && (
        <StepsContent index={steps.indexOf("plan")}>
          <VStack align={"stretch"} gap={4} pt={4}>
            {stepHeading("plan")}
            <RequiredFieldsNote />
            <ResearchPlanOptions key={optionsKey} onChange={setPlanValue} />
            <StepActions
              value={planValue}
              onBack={() => goTo("overview")}
              onNext={() => goTo("options")}
            />
          </VStack>
        </StepsContent>
      )}

      <StepsContent index={steps.indexOf("options")}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {stepHeading("options")}
          <RequiredFieldsNote />
          <TranscriptionOptions
            key={optionsKey}
            identityId={identityId}
            onChange={setOptionsValue}
            direction={{ base: "column" }}
          />
          <StepActions
            value={optionsValue}
            onBack={() => goTo(rpidRequired ? "plan" : "overview")}
            onNext={() => goTo("files")}
          />
        </VStack>
      </StepsContent>

      <StepsContent index={steps.indexOf("files")}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {stepHeading("files")}
          <OptionsSummary options={transcribeProps} />
          <FilePicker
            key={filePickerKey}
            {...filePickerProps}
            disabled={!valid}
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
            <Button variant={"outline"} onClick={() => goTo("options")}>
              <MappedIcon icon={"chevron-left"} size={"xs"} />
              Back
            </Button>
            <Button
              colorPalette={"blue"}
              disabled={!valid || selectedFiles.length === 0}
              onClick={() => onFilesPicked(selectedFiles)}
            >
              Upload
              <MappedIcon icon={"upload"} size={"xs"} />
            </Button>
          </Group>
        </VStack>
      </StepsContent>

      <StepsContent index={steps.indexOf("progress")}>
        <VStack align={"stretch"} gap={4} pt={4}>
          {stepHeading("progress")}
          <OptionsSummary options={transcribeProps} />
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
