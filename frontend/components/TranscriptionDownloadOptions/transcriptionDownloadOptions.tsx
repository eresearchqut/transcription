import * as React from "react";
import { FunctionComponent } from "react";
import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  Skeleton,
  Tooltip,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { TranscriptFormat, useDownload } from "../../hooks/useDownload";
import { MdMovie, MdOutlineSubtitles } from "react-icons/md";
import { VscJson } from "react-icons/vsc";
import { Transcription } from "../../model";
import { useTranscription } from "../../hooks/useTranscription";
import { AiOutlinePlaySquare } from "react-icons/ai";
import { isUndefined } from "lodash";

const mediaKey = (transcription: Transcription): string =>
  transcription.uploadEvent.object.key.split("/").slice(-2).join("/");

export interface DownloadOptionsProps {
  transcription: Transcription;
  onPlayClick: (mediaUrl: string, transcriptUrl: string) => void;
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
> = ({ transcription: initial, onPlayClick }) => {
  const {
    fetchMediaUrl,
    fetchTranscriptUrl,
    downloadTranscript,
    downloadFile,
  } = useDownload();
  const { transcription } = useTranscription({
    jobId: initial.sk,
    transcription: initial,
  });

  if (!transcription) return undefined;

  const loadPlayer = () => {
    const { objectKey, format } = transcriptProps(transcription, "vtt");
    Promise.all([
      fetchMediaUrl(mediaKey(transcription), transcription.metadata.filename),
      fetchTranscriptUrl(objectKey, format),
    ]).then(([mediaUrl, transcriptUrl]) => {
      onPlayClick(mediaUrl, transcriptUrl);
    });
  };

  return (
    <HStack>
      <Menu>
        <MenuButton
          variant={"outline"}
          colorScheme={"blue"}
          as={Button}
          rightIcon={<ChevronDownIcon />}
        >
          Download
        </MenuButton>
        <Portal>
          <MenuList>
            <MenuGroup>
              <MenuItem
                icon={<MdMovie />}
                onClick={() =>
                  downloadFile({
                    objectKey: mediaKey(transcription),
                    filename: transcription.metadata.filename,
                  })
                }
              >
                Media file
              </MenuItem>
            </MenuGroup>
            {transcription.downloadKey && (
              <MenuGroup title={"Transcription formats"}>
                <MenuItem
                  icon={<VscJson />}
                  onClick={() =>
                    downloadFile({
                      objectKey: transcription.downloadKey!,
                      filename: filenameFromFormat(transcription, "json"),
                    })
                  }
                >
                  JSON
                </MenuItem>
                <MenuItem
                  icon={<MdOutlineSubtitles />}
                  onClick={() =>
                    downloadTranscript({
                      ...transcriptProps(transcription, "srt"),
                    })
                  }
                >
                  SRT
                </MenuItem>
                <MenuItem
                  icon={<MdOutlineSubtitles />}
                  onClick={() =>
                    downloadTranscript({
                      ...transcriptProps(transcription, "vtt"),
                    })
                  }
                >
                  VTT
                </MenuItem>
                <MenuItem
                  icon={<MdOutlineSubtitles />}
                  onClick={() =>
                    downloadTranscript({
                      ...transcriptProps(transcription, "docx"),
                    })
                  }
                >
                  DOCX
                </MenuItem>
              </MenuGroup>
            )}
          </MenuList>
        </Portal>
      </Menu>
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
          leftIcon={<AiOutlinePlaySquare />}
          colorScheme={"blue"}
          aria-disabled={isUndefined(transcription?.downloadKey)}
        >
          Play
        </Button>
      </Tooltip>
    </HStack>
  );
};

export default TranscriptionDownloadOptions;
