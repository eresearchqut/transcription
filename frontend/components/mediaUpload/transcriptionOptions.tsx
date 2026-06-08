"use client";

import { FunctionComponent, useEffect, useState } from "react";
import {
  Box,
  Field as ChakraField,
  Code,
  HStack,
  Stack,
  StackProps,
  Text,
} from "@chakra-ui/react";
import { isArray } from "lodash";
import { LanguageInput } from "../../inputs/languageInput";
import { TranslationLanguageInput } from "../../inputs/translationLanguageInput";
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
  targetLanguage?: string;
}

export interface TranscriptionOptionsValue {
  props: TranscribeProps;
  valid: boolean;
}

export interface TranscriptionOptionsProps {
  onChange: (value: TranscriptionOptionsValue) => void;
  identityId?: string;
  direction?: StackProps["direction"];
}

const MAX_LANGUAGE_LIMIT = 5;

export const TranscriptionOptions: FunctionComponent<
  TranscriptionOptionsProps
> = ({ onChange, identityId, direction = { base: "column", sm: "row" } }) => {
  const [languages, setLanguages] = useState<string[]>(["en-AU"]);
  const [enablePiiRedaction, setEnablePiiRedaction] = useState<boolean>(false);
  const [generateSummary, setGenerateSummary] = useState<boolean>(true);
  const [enableTranslation, setEnableTranslation] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string | undefined>();

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

  const onEnableTranslationChange = (d: CheckedChangeDetails) => {
    setEnableTranslation(d.checked);
    if (!d.checked) {
      setTargetLanguage(undefined);
    }
  };

  const languageSizeLimitAchieved = languages.length === MAX_LANGUAGE_LIMIT;
  const languageSizeLimitExceeded = languages.length > MAX_LANGUAGE_LIMIT;

  useEffect(() => {
    const valid =
      !languageSizeLimitExceeded && !(enableTranslation && !targetLanguage);
    onChange({
      props: {
        languages,
        enablePiiRedaction,
        generateSummary,
        targetLanguage: enableTranslation ? targetLanguage : undefined,
      },
      valid,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    languages,
    enablePiiRedaction,
    generateSummary,
    enableTranslation,
    targetLanguage,
  ]);

  return (
    <Stack direction={direction} gap={6} alignSelf={"stretch"}>
      <Field
        invalid={languageSizeLimitExceeded}
        label={"Source Languages"}
        alignItems={"flex-start"}
        gap={1.5}
      >
        <Text fontSize={"sm"} color={"fg.muted"}>
          Specify up to five (5) languages spoken in your audio files.
        </Text>
        <HStack gap={3} align={"center"}>
          <Text fontSize={"sm"} fontWeight={"medium"} whiteSpace={"nowrap"}>
            Source languages
          </Text>
          <LanguageInput
            isMulti={true}
            value={languages}
            disabled={enablePiiRedaction}
            onChange={onLanguageChange}
            maxSize={MAX_LANGUAGE_LIMIT}
            invalid={languageSizeLimitExceeded}
          />
        </HStack>
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
      <Field label={"Translation"} alignItems={"flex-start"} gap={1.5}>
        <Text fontSize={"sm"} color={"fg.muted"}>
          This feature is powered by{" "}
          <ExternalLink href={"https://aws.amazon.com/translate/"}>
            Amazon Translate
          </ExternalLink>
          . Once your media is transcribed, the transcript can be automatically
          translated into another language, with timed subtitles (SRT/VTT), a
          document (DOCX) and plain text available to download. Please be aware
          that machine translations may contain inaccuracies and should be
          reviewed before being relied upon.
        </Text>
        <Switch
          checked={enableTranslation}
          onCheckedChange={onEnableTranslationChange}
        >
          Translate
        </Switch>
        {enableTranslation && (
          <Box minWidth={"15rem"}>
            <TranslationLanguageInput
              value={targetLanguage}
              onChange={(value) => setTargetLanguage(value)}
              placeholder={"Select a language..."}
            />
          </Box>
        )}
        {enableTranslation && !targetLanguage && (
          <ChakraField.HelperText whiteSpace={"nowrap"}>
            Select a language to translate into.
          </ChakraField.HelperText>
        )}
      </Field>
      <Field label={"PII Redaction"} alignItems={"flex-start"} gap={1.5}>
        <Text fontSize={"sm"} color={"fg.muted"}>
          PII includes names, addresses, phone numbers, and credit card
          information. When PII redaction is enabled, identified instances of
          PII will be replaced with <Code>[PII]</Code> in the transcription.
        </Text>
        <Switch
          checked={enablePiiRedaction}
          onCheckedChange={onEnablePiiRedactionChange}
        >
          Redact <abbr title={"Personally Identifiable Information"}>PII</abbr>
        </Switch>
      </Field>
      <NewFeature show={showNewFeature("ERP-2764")}>
        <Field label={"AI Summary"} alignItems={"flex-start"} gap={1.5}>
          <Text fontSize={"sm"} color={"fg.muted"}>
            This service is powered by{" "}
            <ExternalLink href={"https://aws.amazon.com/bedrock/"}>
              Amazon Bedrock
            </ExternalLink>
            . Using generative AI and the Claude Haiku model, a summary is
            generated from the transcription of the provided media. Classifier
            metrics are used to identify potential violations of{" "}
            <ExternalLink href={"https://aws.amazon.com/aup/"}>
              Acceptable Use
            </ExternalLink>{" "}
            and{" "}
            <ExternalLink
              href={"https://aws.amazon.com/ai/responsible-ai/policy/"}
            >
              Responsible Use
            </ExternalLink>{" "}
            policies. By using this service you are expected to comply with{" "}
            <ExternalLink href={"https://www.anthropic.com/legal/aup"}>
              Anthropic&apos;s Usage Policy.
            </ExternalLink>{" "}
            Please be aware that factual assertions in the output should not be
            relied upon without independently checking their accuracy, as they
            may be false, incomplete, misleading or not reflective of recent
            events or information.
          </Text>
          <Switch
            checked={generateSummary}
            onCheckedChange={onGenerateSummaryChange}
          >
            Generate Summary
          </Switch>
        </Field>
      </NewFeature>
    </Stack>
  );
};

export default TranscriptionOptions;
