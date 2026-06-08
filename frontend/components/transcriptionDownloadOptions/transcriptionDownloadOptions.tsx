import * as React from "react";
import { FunctionComponent } from "react";
import { Button, Stack } from "@chakra-ui/react";
import { TranscriptFormat, useDownload } from "../../hooks/useDownload";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { isUndefined } from "lodash";
import { MappedIcon } from "../mappedIcon";
import {
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { Tooltip } from "../ui/tooltip";
import { Transcription } from "model";
import supportedTranslationLanguages from "@/public/supported_translation_languages.json";

const mediaKey = (transcription: Transcription): string => {
  const key = transcription.uploadEvent.object.key;
  return key.startsWith("users/") ? key : key.split("/").slice(-2).join("/");
};

export interface DownloadOptionsProps
  extends Required<Pick<UseTranscriptionProps, "initialTranscription">> {
  handlePlayClick: (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
  ) => void;
}

const filenameFromFormat = (transcription: Transcription, format: string) =>
  [transcription.metadata.filename.split(".")[0], format].join(".");

const languageDisplayName = (code: string) =>
  (supportedTranslationLanguages as Record<string, string>)[code] ?? code;

const transcriptProps = (
  transcription: Transcription,
  format: TranscriptFormat,
) => ({
  objectKey: transcription.downloadKey!,
  filename: filenameFromFormat(transcription, format),
  format,
});

export const TranscriptionDownloadOptions: FunctionComponent<
  DownloadOptionsProps
> = ({ initialTranscription, handlePlayClick }) => {
  const {
    fetchMediaUrl,
    fetchTranscriptUrl,
    fetchTranslatedTranscriptUrl,
    downloadTranscript,
    downloadTranslatedTranscript,
    downloadFile,
  } = useDownload();
  const { transcription, summary } = useTranscription({
    jobId: initialTranscription.sk,
    initialTranscription,
  });

  if (!transcription) return undefined;

  const targetLanguage = transcription.metadata.targetlanguage;
  const translationLanguageName = targetLanguage
    ? languageDisplayName(targetLanguage)
    : undefined;
  const translatedFilename = (format: string) =>
    [
      transcription.metadata.filename.split(".")[0],
      targetLanguage,
      format,
    ].join(".");

  const loadPlayer = () => {
    const { objectKey, format } = transcriptProps(transcription, "vtt");
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      fetchTranscriptUrl(objectKey, format),
    ]).then(([mediaUrl, transcriptUrl]) => {
      handlePlayClick(mediaUrl, transcriptUrl, summary);
    });
  };

  const loadTranslatedPlayer = () => {
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      fetchTranslatedTranscriptUrl(transcription.translationKey!, "vtt", {
        includeSpeakers: false,
      }),
    ]).then(([mediaUrl, transcriptUrl]) => {
      handlePlayClick(mediaUrl, transcriptUrl, summary);
    });
  };

  return (
    <Stack direction={{ base: "column", sm: "row" }}>
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant={"outline"} colorPalette={"blue"}>
            <MappedIcon icon={"chevron-down"} size={"xs"} />
            Download
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItemGroup>
            <MenuItem
              value={"media"}
              onClick={() =>
                downloadFile({
                  objectKey: mediaKey(transcription),
                  filename: transcription.metadata.filename,
                })
              }
            >
              <MappedIcon icon={"movie"} /> Media file
            </MenuItem>
          </MenuItemGroup>
          <MenuSeparator />
          {transcription.summaryKey && (
            <MenuItemGroup>
              <MenuItem
                value={"summary-txt"}
                onClick={() => {
                  downloadFile({
                    objectKey: transcription.summaryKey!,
                    filename: `Summary - ${filenameFromFormat(transcription, "txt")}`,
                  });
                }}
              >
                <MappedIcon icon={"readme"} /> Summary (.txt)
              </MenuItem>
            </MenuItemGroup>
          )}
          <MenuSeparator />
          {transcription.downloadKey && (
            <MenuItemGroup title={"Transcription"}>
              <MenuItem
                value={"json"}
                onClick={() =>
                  downloadFile({
                    objectKey: transcription.downloadKey!,
                    filename: filenameFromFormat(transcription, "json"),
                  })
                }
              >
                <MappedIcon icon={"json"} /> JSON
              </MenuItem>
              <MenuItem
                value={"srt"}
                onClick={() =>
                  downloadTranscript({
                    ...transcriptProps(transcription, "srt"),
                  })
                }
              >
                <MappedIcon icon={"subtitle"} /> SRT
              </MenuItem>
              <MenuItem
                value={"vtt"}
                onClick={() =>
                  downloadTranscript({
                    ...transcriptProps(transcription, "vtt"),
                  })
                }
              >
                <MappedIcon icon={"subtitle"} /> VTT
              </MenuItem>
              <MenuItem
                value={"docx"}
                onClick={() =>
                  downloadTranscript({
                    ...transcriptProps(transcription, "docx"),
                  })
                }
              >
                <MappedIcon icon={"subtitle"} /> DOCX
              </MenuItem>
            </MenuItemGroup>
          )}
          {transcription.translationKey && (
            <>
              <MenuSeparator />
              <MenuItemGroup title={`Translation (${translationLanguageName})`}>
                <MenuItem
                  value={"translation-txt"}
                  onClick={() =>
                    downloadTranslatedTranscript({
                      objectKey: transcription.translationKey!,
                      filename: translatedFilename("txt"),
                      format: "txt",
                    })
                  }
                >
                  <MappedIcon icon={"readme"} /> Text (.txt)
                </MenuItem>
                <MenuItem
                  value={"translation-srt"}
                  onClick={() =>
                    downloadTranslatedTranscript({
                      objectKey: transcription.translationKey!,
                      filename: translatedFilename("srt"),
                      format: "srt",
                    })
                  }
                >
                  <MappedIcon icon={"subtitle"} /> SRT
                </MenuItem>
                <MenuItem
                  value={"translation-vtt"}
                  onClick={() =>
                    downloadTranslatedTranscript({
                      objectKey: transcription.translationKey!,
                      filename: translatedFilename("vtt"),
                      format: "vtt",
                    })
                  }
                >
                  <MappedIcon icon={"subtitle"} /> VTT
                </MenuItem>
                <MenuItem
                  value={"translation-docx"}
                  onClick={() =>
                    downloadTranslatedTranscript({
                      objectKey: transcription.translationKey!,
                      filename: translatedFilename("docx"),
                      format: "docx",
                    })
                  }
                >
                  <MappedIcon icon={"subtitle"} /> DOCX
                </MenuItem>
              </MenuItemGroup>
            </>
          )}
        </MenuContent>
      </MenuRoot>
      <Tooltip
        content={
          isUndefined(transcription.downloadKey) &&
          "This action is available once your transcription job has completed."
        }
      >
        <Button
          onClick={() =>
            transcription?.downloadKey ? loadPlayer() : undefined
          }
          variant={"solid"}
          colorPalette={"blue"}
          aria-disabled={isUndefined(transcription?.downloadKey)}
        >
          <MappedIcon icon={"play-outline-square"} />
          Play
        </Button>
      </Tooltip>
      {transcription.translationKey && (
        <Button
          onClick={() => loadTranslatedPlayer()}
          variant={"outline"}
          colorPalette={"blue"}
        >
          <MappedIcon icon={"play-outline-square"} />
          Play ({translationLanguageName})
        </Button>
      )}
    </Stack>
  );
};

export default TranscriptionDownloadOptions;
