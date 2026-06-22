import * as React from "react";
import { FunctionComponent } from "react";
import { Box, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { lowerCase } from "lodash";
import { TranscriptionDownloadOptions } from "../transcriptionDownloadOptions/transcriptionDownloadOptions";
import {
  enableGenerateSummary,
  enableTranslation,
  isTranslationFailed,
  mapTranscriptionStatus,
  TranscriptionJobStatus,
} from "model";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { ProgressBar, ProgressLabel, ProgressRoot } from "../ui/progress";
import { MappedIcon } from "../mappedIcon";
import { Alert } from "../ui/alert";
import { SUPPORTED_TRANSLATION_LANGUAGES as supportedTranslationLanguages } from "model";

export interface TranscriptionJobProgress {
  status?: TranscriptionJobStatus;
}

export interface FileTranscriptionProgressProps
  extends Pick<UseTranscriptionProps, "jobId"> {
  filename: string;
  uploadProgress: number;
  onPlayClick: (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
  ) => void;
}

const isUploadComplete = (progress: number) => progress === 100;
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

const GenerateSummaryStatus = ({
  summaryKey,
}: {
  summaryKey: string | undefined;
}) => {
  const iconProps = { mr: 2, mb: 1 };
  return (
    <Box>
      {!summaryKey ? (
        <>
          <Spinner size={"sm"} mr={1} /> Generating summary
        </>
      ) : (
        <>
          <MappedIcon
            icon={"check-circle"}
            {...iconProps}
            color={"green.600"}
          />
          Summary generated
        </>
      )}
    </Box>
  );
};

const TranslationStatus = ({
  targetLanguage,
  translationKey,
  failed,
}: {
  targetLanguage: string | undefined;
  translationKey: string | undefined;
  failed: boolean;
}) => {
  const iconProps = { mr: 2, mb: 1 };
  const languageName =
    (supportedTranslationLanguages as Record<string, string>)[
      targetLanguage ?? ""
    ] ?? targetLanguage;
  if (failed) {
    return (
      <Box>
        <MappedIcon
          icon={"exclamation-circle"}
          {...iconProps}
          color={"red.600"}
        />
        Translation to {languageName} failed
      </Box>
    );
  }
  return (
    <Box>
      {!translationKey ? (
        <>
          <Spinner size={"sm"} mr={1} /> Translating to {languageName}
        </>
      ) : (
        <>
          <MappedIcon
            icon={"check-circle"}
            {...iconProps}
            color={"green.600"}
          />
          Translation ready
        </>
      )}
    </Box>
  );
};

export const TranscriptionProgress: FunctionComponent<
  FileTranscriptionProgressProps
> = ({ jobId, filename, uploadProgress, onPlayClick }) => {
  const { transcription, isTranscribeCompleted, isPipelineCompleted } =
    useTranscription({ jobId });
  const transcriptionStatus = mapTranscriptionStatus(transcription);
  const uploadCompleted = isUploadComplete(uploadProgress);
  const isTranscribeJobCompleted = transcriptionStatus === "COMPLETED";

  return (
    <Alert
      key={filename}
      title={
        <Text pl={2} fontSize={"lg"}>
          {filename}
        </Text>
      }
      status={
        isPipelineCompleted
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
            isTranscribeJobCompleted
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
            processingText={"Uploading. Please do not close your browser..."}
            completedText={"Upload successful"}
          />
          {uploadCompleted && (
            <TranscriptionProgressStatus status={transcriptionStatus} />
          )}
          {isTranscribeJobCompleted &&
            enableGenerateSummary(transcription!) && (
              <GenerateSummaryStatus summaryKey={transcription?.summaryKey} />
            )}
          {isTranscribeJobCompleted && enableTranslation(transcription!) && (
            <TranslationStatus
              targetLanguage={transcription?.metadata.targetlanguage}
              translationKey={transcription?.translationKey}
              failed={isTranslationFailed(transcription!)}
            />
          )}
        </VStack>
        {isTranscribeCompleted && (
          <TranscriptionDownloadOptions
            initialTranscription={transcription!}
            handlePlayClick={onPlayClick}
          />
        )}
      </Stack>
    </Alert>
  );
};

export default TranscriptionProgress;
