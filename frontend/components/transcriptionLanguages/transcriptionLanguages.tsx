import { FunctionComponent } from "react";
import {
  useTranscription,
  UseTranscriptionProps,
} from "../../hooks/useTranscription";
import { List, ListItem } from "@chakra-ui/react";
import { get, isUndefined } from "lodash";
import supportedLanguages from "@/public/supported_transcription_languages.json";
import { Transcription } from "model";
import { Tag } from "../ui/tag";

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

  if (isTranscribeFailed) return <Tag colorPalette={"red"}>FAILED</Tag>;
  if (!isTranscribeCompleted) return <Tag>LOADING...</Tag>;

  return (
    <List.Root variant={"plain"}>
      {languagesFromTranscription(transcription)?.map((lang) => (
        <ListItem key={lang} display={"inline-list-item"}>
          <Tag mr={2}>{lang?.toUpperCase()}</Tag>
        </ListItem>
      ))}
      {piiRedacted && (
        <ListItem display={"inline-list-item"}>
          <Tag mr={2} variant={"outline"} colorPalette={"red"}>
            PII REDACTED
          </Tag>
        </ListItem>
      )}
    </List.Root>
  );
};

export default TranscriptionLanguages;
