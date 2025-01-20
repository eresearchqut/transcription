import * as React from "react";
import { FunctionComponent } from "react";
import { Button, Stack } from "@chakra-ui/react";
import { TranscriptFormat, useDownload } from "../../hooks/useDownload";
import { Transcription } from "../../model";
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

const mediaKey = (transcription: Transcription): string =>
  transcription.uploadEvent.object.key.split("/").slice(-2).join("/");

export interface DownloadOptionsProps
  extends Required<Pick<UseTranscriptionProps, "initialTranscription">> {
  handlePlayClick: (mediaUrl: string, transcriptUrl: string) => void;
}

const filenameFromFormat = (transcription: Transcription, format: string) =>
  [transcription.metadata.filename.split(".")[0], format].join(".");

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
    downloadTranscript,
    downloadFile,
  } = useDownload();
  const { transcription } = useTranscription({
    jobId: initialTranscription.sk,
    initialTranscription,
  });

  if (!transcription) return undefined;

  const loadPlayer = () => {
    const { objectKey, format } = transcriptProps(transcription, "vtt");
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      fetchTranscriptUrl(objectKey, format),
    ]).then(([mediaUrl, transcriptUrl]) => {
      handlePlayClick(mediaUrl, transcriptUrl);
    });
  };

  return (
    <Stack direction={{ base: "column", sm: "row" }}>
      <MenuRoot>
        <MenuTrigger variant={"outline"} colorPalette={"blue"} asChild>
          <Button>
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
          {transcription.downloadKey && (
            <MenuItemGroup title={"Transcription formats"}>
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
        </MenuContent>
      </MenuRoot>
      <Tooltip
        label={
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
    </Stack>
  );
};

export default TranscriptionDownloadOptions;
