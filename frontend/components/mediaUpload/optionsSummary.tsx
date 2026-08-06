"use client";

import { Badge, Flex, Group, Text, Wrap } from "@chakra-ui/react";
import { get } from "lodash";
import {
  SUPPORTED_TRANSCRIPTION_LANGUAGES as supportedLanguages,
  SUPPORTED_TRANSLATION_LANGUAGES as supportedTranslationLanguages,
} from "model";
import type { FunctionComponent } from "react";
import type { TranscribeProps } from "./transcriptionOptions";

const languageName = (code: string): string =>
  get(supportedLanguages, code, code);
const translationLanguageName = (code: string): string =>
  get(supportedTranslationLanguages, code, code);

export interface OptionsSummaryProps {
  options: TranscribeProps;
}

interface OptionBadgeProps {
  label: string;
  value: string;
}

export const OptionBadge = ({ label, value }: OptionBadgeProps) => (
  <Group attached>
    <Badge variant={"solid"} colorPalette={"gray"} fontSize={"xs"}>
      {label}
    </Badge>
    <Badge variant={"solid"} colorPalette={"blue"} fontSize={"xs"}>
      {value}
    </Badge>
  </Group>
);

export const OptionsSummary: FunctionComponent<OptionsSummaryProps> = ({
  options: {
    languages,
    enablePiiRedaction,
    generateSummary,
    targetLanguage,
    rpid,
  },
}) => {
  return (
    <Flex alignItems={"center"} gap={2} flexWrap={"wrap"}>
      <Text fontSize={"sm"} fontWeight={"medium"} whiteSpace={"nowrap"}>
        Selected options:
      </Text>
      <Wrap gap={2}>
        <OptionBadge label={"Research Project"} value={rpid ?? "None"} />
        <OptionBadge
          label={"Source languages"}
          value={languages
            .map((lang) => `\u2018${languageName(lang)}\u2019`)
            .join(", ")}
        />
        <OptionBadge
          label={"Translation language"}
          value={
            targetLanguage
              ? `\u2018${translationLanguageName(targetLanguage)}\u2019`
              : "Off"
          }
        />
        <OptionBadge
          label={"PII redaction"}
          value={enablePiiRedaction ? "Enabled" : "Disabled"}
        />
        <OptionBadge
          label={"AI summary"}
          value={generateSummary ? "Enabled" : "Disabled"}
        />
      </Wrap>
    </Flex>
  );
};

export default OptionsSummary;
