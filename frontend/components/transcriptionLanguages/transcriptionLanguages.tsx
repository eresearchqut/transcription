import { FunctionComponent } from "react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { List, ListItem, Tag } from "@chakra-ui/react";
import { isDefined } from "@chakra-ui/utils";
import { get, isUndefined } from "lodash";
import supportedLanguages from "@/public/supported_languages.json";
import { Transcription } from "model";

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
    .filter((lang) => isDefined(lang))
    .map((lang) => get(supportedLanguages, lang!, lang));
};

export const TranscriptionLanguages: FunctionComponent<
  UseTranscriptionProps
> = ({ jobId, transcription }) => {
  const { transcription: transcriptionState, isJobFinished } = useTranscription(
    {
      jobId,
      transcription,
    },
  );
  const piiRedacted = isDefined(
    transcription?.transcriptionResponse?.TranscriptionJob?.ContentRedaction
      ?.RedactionType,
  );

  if (!isJobFinished) return <Tag>LOADING...</Tag>;

  return (
    <List variant={"unstyled"}>
      {languagesFromTranscription(transcription)?.map((lang) => (
        <ListItem key={lang} display={"inline-list-item"}>
          <Tag mr={2}>{lang?.toUpperCase()}</Tag>
        </ListItem>
      ))}
      {piiRedacted && (
        <ListItem display={"inline-list-item"}>
          <Tag mr={2} variant={"outline"} colorScheme={"red"}>
            PII REDACTED
          </Tag>
        </ListItem>
      )}
    </List>
  );
};

export default TranscriptionLanguages;
