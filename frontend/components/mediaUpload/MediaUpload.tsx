"use client";

import { FunctionComponent, useState } from "react";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import {
  Box,
  Code,
  Field as ChakraField,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LanguageInput } from "../../inputs/languageInput";
import { isArray } from "lodash";
import { TRANSCRIBE_QUOTAS } from "model";
import { HelpPopover } from "@/components/helpPopover";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CheckedChangeDetails } from "@zag-js/switch";
import { ExternalLink } from "@/components/externalLink";
import { NewFeature } from "@/components/newFeature";
import { useNewFeatureStorage } from "../../hooks/useNewFeatureStorage";
import features from "@/public/features.json";

export interface TranscribeProps {
  languages: string[];
  enablePiiRedaction: boolean;
  generateSummary: boolean;
}

export interface MediaUploadProps {
  onSubmit: (transcribeProps: TranscribeProps, files: File[]) => void;
  identityId?: string;
}

export const MediaUpload: FunctionComponent<MediaUploadProps> = ({
  onSubmit,
  identityId,
}) => {
  const [languages, setLanguages] = useState<string[]>(["en-AU"]);
  const [enablePiiRedaction, setEnablePiiRedaction] = useState<boolean>(false);
  const [generateSummary, setGenerateSummary] = useState<boolean>(true);

  const { showNewFeature } = useNewFeatureStorage({
    features,
    identityId,
  });

  const onLanguageChange = (selectedLanguages: string | string[]) => {
    setLanguages(
      isArray(selectedLanguages) ? selectedLanguages : [selectedLanguages],
    );
  };

  const onEnablePiiRedactionChange = (d: CheckedChangeDetails) => {
    const isChecked = d.checked;
    if (isChecked) {
      setLanguages(["en-US"]);
    }
    setEnablePiiRedaction(isChecked);
  };

  const onGenerateSummaryChange = (d: CheckedChangeDetails) => {
    setGenerateSummary(d.checked);
  };

  const onFilesPicked = (files: File[]) => {
    onSubmit({ languages, enablePiiRedaction, generateSummary }, files);
  };

  const { accept, maximumFileSizeBytes, maximumFilesCount } = TRANSCRIBE_QUOTAS;

  const filePickerProps: FilePickerProps = {
    accept,
    maxFiles: maximumFilesCount,
    maxSize: maximumFileSizeBytes,
    onFilesPicked,
  };

  const MAX_LANGUAGE_LIMIT = 5;
  const languageSizeLimitAchieved = languages.length === MAX_LANGUAGE_LIMIT;
  const languageSizeLimitExceeded = languages.length > MAX_LANGUAGE_LIMIT;

  return (
    <VStack align={"stretch"} gap={4}>
      <Stack
        direction={{ base: "column", sm: "row" }}
        gap={4}
        alignSelf={"flex-start"}
        alignItems={{ sm: "center" }}
      >
        <NewFeature show={showNewFeature("ERP-2764")}>
          <Field
            display={"flex"}
            flexDirection={"row"}
            alignItems={"center"}
            label={
              <Box as={"span"} whiteSpace={"nowrap"}>
                Generate Summary
              </Box>
            }
          >
            <Switch
              checked={generateSummary}
              onCheckedChange={onGenerateSummaryChange}
            />
            <HelpPopover
              ariaLabel={"Help with Generate Summary"}
              header={"Generate Summary"}
            >
              <VStack gap={3}>
                <Text>
                  This service is powered by{" "}
                  <ExternalLink href={"https://aws.amazon.com/bedrock/"}>
                    Amazon Bedrock
                  </ExternalLink>
                  . Using generative AI and the Claude Haiku model, a summary is
                  generated from the transcription of the provided media.
                  Classifier metrics are used to identify potential violations
                  of{" "}
                  <ExternalLink href={"https://aws.amazon.com/aup/"}>
                    Acceptable Use
                  </ExternalLink>{" "}
                  and{" "}
                  <ExternalLink
                    href={"https://aws.amazon.com/ai/responsible-ai/policy/"}
                  >
                    Responsible Use
                  </ExternalLink>{" "}
                  policies.
                </Text>
                <Text>
                  By using this service you are expected to comply with{" "}
                  <ExternalLink href={"https://www.anthropic.com/legal/aup"}>
                    Anthropic&apos;s Usage Policy.
                  </ExternalLink>
                </Text>
                <Text>
                  Please be aware that factual assertions in the output should
                  not be relied upon without independently checking their
                  accuracy, as they may be false, incomplete, misleading or not
                  reflective of recent events or information.
                </Text>
              </VStack>
            </HelpPopover>
          </Field>
        </NewFeature>
        <Field
          display={"flex"}
          flexDirection={"row"}
          alignItems={"center"}
          label={
            <Text as={"span"}>
              Redact{" "}
              <abbr title={"Personally Identifiable Information"}>PII</abbr>
            </Text>
          }
        >
          <Switch
            checked={enablePiiRedaction}
            onCheckedChange={onEnablePiiRedactionChange}
          />
          <HelpPopover
            ariaLabel={"Help with Redact PII"}
            header={"Redact Personally Identifiable Information (PII)"}
          >
            PII includes names, addresses, phone numbers, and credit card
            information. When PII redaction is enabled, identified instances of
            PII will be replaced with <Code>[PII]</Code> in the transcription.
          </HelpPopover>
        </Field>
        <Field
          display={"flex"}
          flexDirection={"row"}
          alignItems={"center"}
          minWidth={"max-content"}
          invalid={languageSizeLimitExceeded}
          label={"Languages"}
        >
          <LanguageInput
            isMulti={true}
            value={languages}
            disabled={enablePiiRedaction}
            onChange={onLanguageChange}
            maxSize={MAX_LANGUAGE_LIMIT}
            invalid={languageSizeLimitExceeded}
          />
          <HelpPopover ariaLabel={"Help with Languages"} header={"Languages"}>
            Specify up to five (5) languages spoken in your audio files.
          </HelpPopover>
          {enablePiiRedaction && (
            <ChakraField.HelperText whiteSpace={"nowrap"}>
              PII Redaction only available for English, US.
            </ChakraField.HelperText>
          )}
          {languageSizeLimitAchieved && (
            <ChakraField.HelperText whiteSpace={"nowrap"}>
              A maximum of {MAX_LANGUAGE_LIMIT} languages is allowed.
            </ChakraField.HelperText>
          )}
        </Field>
      </Stack>
      <FilePicker {...filePickerProps} disabled={languageSizeLimitExceeded} />
    </VStack>
  );
};

export default MediaUpload;
