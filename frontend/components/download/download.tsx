import * as React from "react";
import { FunctionComponent } from "react";
import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  TranscriptFormat,
  useDownload,
} from "../../hooks/useDownload/useDownload";
import { MdMovie, MdOutlineSubtitles } from "react-icons/md";
import { VscJson } from "react-icons/vsc";
import { Transcription } from "../../model";
import { useTranscription } from "../../hooks/useTranscription";
import { AiOutlinePlaySquare } from "react-icons/ai";

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

export const Download: FunctionComponent<DownloadOptionsProps> = ({
  transcription: initial,
  onPlayClick,
}) => {
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
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
          Download
        </MenuButton>
        <Portal>
          <MenuList>
            <MenuItem
              icon={<MdMovie />}
              onClick={() =>
                downloadFile({
                  objectKey: mediaKey(transcription),
                  filename: transcription.metadata.filename,
                })
              }
            >
              Media
            </MenuItem>
            {transcription.downloadKey && (
              <>
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
              </>
            )}
          </MenuList>
        </Portal>
      </Menu>
      {transcription?.downloadKey && (
        <Button
          onClick={() => loadPlayer()}
          variant={"solid"}
          leftIcon={<AiOutlinePlaySquare />}
        >
          Play
        </Button>
      )}
    </HStack>
  );
};

export default Download;
