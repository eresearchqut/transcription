import { IconButton } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { MappedIcon } from "@/components/mappedIcon";
import {
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type UseTranscriptionProps,
  useTranscription,
} from "../../hooks/useTranscription";

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
