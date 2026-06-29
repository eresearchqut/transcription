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
import { languagesFromTranscription } from "@/components/transcriptionLanguages";
import { SUPPORTED_TRANSLATION_LANGUAGES as supportedTranslationLanguages } from "model";

const mediaKey = (transcription: Transcription): string =>
  transcription.uploadEvent.object.key;

export interface DownloadOptionsProps
  extends Required<Pick<UseTranscriptionProps, "initialTranscription">> {
  handlePlayClick: (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
    languages?: (string | undefined)[],
    speakers?: string[],
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

const MenuChevron = () => <MappedIcon icon={"chevron-down"} size={"xs"} />;

const PlayButtonContent = () => (
  <>
    <MappedIcon icon={"play-outline-square"} />
    Play
    <MenuChevron />
  </>
);

export const TranscriptionDownloadOptions: FunctionComponent<
  DownloadOptionsProps
> = ({ initialTranscription, handlePlayClick }) => {
  const {
    fetchMediaUrl,
    fetchTranscriptForPlayer,
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
  const translationLanguageLabel = translationLanguageName ?? "Translation";
  const originalLanguageNames = languagesFromTranscription(transcription);
  const originalLanguageLabel =
    originalLanguageNames && originalLanguageNames.length === 1
      ? `Original (${originalLanguageNames[0]})`
      : "Original transcript";
  const translatedFilename = (format: string) =>
    [
      transcription.metadata.filename.split(".")[0],
      targetLanguage,
      format,
    ].join(".");
  const playUnavailable = isUndefined(transcription.downloadKey);

  const loadPlayer = (
    transcript: Promise<{
      url: string;
      languages?: (string | undefined)[];
      speakers?: string[];
    }>,
  ) => {
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      transcript,
    ]).then(([mediaUrl, { url, languages, speakers }]) => {
      handlePlayClick(mediaUrl, url, summary, languages ?? [], speakers ?? []);
    });
  };

  const loadOriginalPlayer = () => {
    const { objectKey } = transcriptProps(transcription, "vtt");
    loadPlayer(fetchTranscriptForPlayer(objectKey));
  };

  const loadTranslatedPlayer = () => {
    loadPlayer(
      fetchTranslatedTranscriptUrl(transcription.translationKey!, "vtt", {
        includeSpeakers: false,
      }).then((url) => ({ url })),
    );
  };

  return (
    <Stack direction={{ base: "column", sm: "row" }}>
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant={"outline"} colorPalette={"blue"}>
            Download
            <MenuChevron />
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
          {(transcription.summaryKey || transcription.downloadKey) && (
            <MenuSeparator />
          )}
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
          {transcription.summaryKey && transcription.downloadKey && (
            <MenuSeparator />
          )}
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
                value={"txt"}
                onClick={() =>
                  downloadTranscript({
                    ...transcriptProps(transcription, "txt"),
                  })
                }
              >
                <MappedIcon icon={"readme"} /> Text (.txt)
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
              <MenuItemGroup
                title={`Translation (${translationLanguageLabel})`}
              >
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
      {!playUnavailable ? (
        <MenuRoot>
          <MenuTrigger asChild>
            <Button variant={"solid"} colorPalette={"blue"}>
              <PlayButtonContent />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItemGroup title={"Language"}>
              <MenuItem value={"original"} onClick={() => loadOriginalPlayer()}>
                <MappedIcon icon={"subtitle"} /> {originalLanguageLabel}
              </MenuItem>
              {transcription.translationKey && (
                <MenuItem
                  value={"translation"}
                  onClick={() => loadTranslatedPlayer()}
                >
                  <MappedIcon icon={"subtitle"} /> {translationLanguageLabel}
                </MenuItem>
              )}
            </MenuItemGroup>
          </MenuContent>
        </MenuRoot>
      ) : (
        <Tooltip
          content="This action is available once your transcription job has completed."
          disabled={!playUnavailable}
          positioning={{ placement: "left" }}
          portalled
        >
          <Button
            onClick={() =>
              transcription?.downloadKey ? loadOriginalPlayer() : undefined
            }
            variant={"solid"}
            colorPalette={"blue"}
            aria-disabled={playUnavailable}
          >
            <PlayButtonContent />
          </Button>
        </Tooltip>
      )}
    </Stack>
  );
};

export default TranscriptionDownloadOptions;
