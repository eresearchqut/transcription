import React, { FunctionComponent } from "react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { IconButton } from "@chakra-ui/react";
import {
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MappedIcon } from "@/components/mappedIcon";

const TranscriptionSummary: FunctionComponent<UseTranscriptionProps> = ({
  jobId,
  initialTranscription,
}) => {
  const { summary } = useTranscription({
    jobId,
    initialTranscription,
  });

  if (!summary) return null;

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <IconButton
          aria-label={"View summary"}
          rounded={"full"}
          cursor={"pointer"}
          colorPalette={"blue"}
          size={"2xs"}
        >
          <MappedIcon icon={"generated"} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>Transcription Summary</PopoverHeader>
        <PopoverArrow />
        <PopoverBody>{summary}</PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
};

export default TranscriptionSummary;
