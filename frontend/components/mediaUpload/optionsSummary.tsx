"use client";

import { FunctionComponent } from "react";
import { Box, DataList, Heading } from "@chakra-ui/react";
import { get } from "lodash";
import supportedLanguages from "@/public/supported_languages.json";
import supportedTranslationLanguages from "@/public/supported_translation_languages.json";
import { TranscribeProps } from "./transcriptionOptions";

const languageName = (code: string): string =>
  get(supportedLanguages, code, code);
const translationLanguageName = (code: string): string =>
  get(supportedTranslationLanguages, code, code);

export interface OptionsSummaryProps {
  options: TranscribeProps;
}

export const OptionsSummary: FunctionComponent<OptionsSummaryProps> = ({
  options: { languages, enablePiiRedaction, generateSummary, targetLanguage },
}) => {
  return (
    <Box borderWidth={1} borderRadius={"md"} p={4}>
      <Heading as={"h3"} size={"sm"} mb={3}>
        Selected options
      </Heading>
      <DataList.Root orientation={"horizontal"} gap={2}>
        <DataList.Item>
          <DataList.ItemLabel flex={"none"} minW={"10rem"}>
            Source languages
          </DataList.ItemLabel>
          <DataList.ItemValue>
            {languages.map(languageName).join(", ")}
          </DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel flex={"none"} minW={"10rem"}>
            Translation language
          </DataList.ItemLabel>
          <DataList.ItemValue>
            {targetLanguage ? translationLanguageName(targetLanguage) : "Off"}
          </DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel flex={"none"} minW={"10rem"}>
            PII redaction
          </DataList.ItemLabel>
          <DataList.ItemValue>
            {enablePiiRedaction ? "On" : "Off"}
          </DataList.ItemValue>
        </DataList.Item>
        <DataList.Item>
          <DataList.ItemLabel flex={"none"} minW={"10rem"}>
            AI summary
          </DataList.ItemLabel>
          <DataList.ItemValue>
            {generateSummary ? "On" : "Off"}
          </DataList.ItemValue>
        </DataList.Item>
      </DataList.Root>
    </Box>
  );
};

export default OptionsSummary;
