import { Badge, List, ListItem } from "@chakra-ui/react";
import { get, isUndefined } from "lodash";
import type { Transcription } from "model";
import { SUPPORTED_TRANSCRIPTION_LANGUAGES as supportedLanguages } from "model";
import type { FunctionComponent } from "react";
import {
  type UseTranscriptionProps,
  useTranscription,
} from "../../hooks/useTranscription";

export const languagesFromTranscription = (
  transcription: Transcription | undefined,
) => {
  if (isUndefined(transcription)) return;

  const jobResponse = transcription?.transcriptionResponse?.TranscriptionJob;
  return [
    jobResponse?.LanguageCode,
    ...(jobResponse?.LanguageCodes?.map((lang) => lang.LanguageCode) ?? []),
    ...(jobResponse?.LanguageOptions ?? []),
  ]
    .filter((lang) => !isUndefined(lang))
    .map((lang) => get(supportedLanguages, lang!, lang));
};

export const TranscriptionLanguages: FunctionComponent<
  UseTranscriptionProps
> = ({ jobId, initialTranscription }) => {
  const { transcription, isTranscribeCompleted, isTranscribeFailed } =
    useTranscription({
      jobId,
      initialTranscription,
    });
  const piiRedacted = !isUndefined(
    transcription?.transcriptionResponse?.TranscriptionJob?.ContentRedaction
      ?.RedactionType,
  );

  if (isTranscribeFailed) {
    return (
      <Badge colorPalette={"red"} minW={"max-content"} variant={"surface"}>
        FAILED
      </Badge>
    );
  }

  if (!isTranscribeCompleted) {
    return (
      <Badge minW={"max-content"} variant={"surface"}>
        LOADING...
      </Badge>
    );
  }

  return (
    <List.Root variant={"plain"}>
      {languagesFromTranscription(transcription)?.map((lang) => (
        <ListItem key={lang} display={"inline-list-item"}>
          <Badge minW={"max-content"} mr={2} variant={"surface"}>
            {lang?.toUpperCase()}
          </Badge>
        </ListItem>
      ))}
      {piiRedacted && (
        <ListItem display={"inline-list-item"}>
          <Badge
            colorPalette={"red"}
            minW={"max-content"}
            mr={2}
            variant={"outline"}
          >
            PII REDACTED
          </Badge>
        </ListItem>
      )}
    </List.Root>
  );
};

export default TranscriptionLanguages;
