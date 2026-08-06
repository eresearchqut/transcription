"use client";

import {
  Box,
  Button,
  Field as ChakraField,
  Code,
  Heading,
  Stack,
  type StackProps,
  Text,
} from "@chakra-ui/react";
import type { CheckedChangeDetails } from "@zag-js/switch";
import { isArray } from "lodash";
import { type FunctionComponent, useEffect, useState } from "react";
import { ExternalLink } from "@/components/externalLink";
import { NewFeature } from "@/components/newFeature";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import features from "@/public/features.json";
import { useNewFeatureStorage } from "../../hooks/useNewFeatureStorage";
import { useRpids } from "../../hooks/useRpids";
import { LanguageInput } from "../../inputs/languageInput";
import { RpidInput } from "../../inputs/rpidInput";
import { TranslationLanguageInput } from "../../inputs/translationLanguageInput";

export interface TranscribeProps {
  languages: string[];
  enablePiiRedaction: boolean;
  generateSummary: boolean;
  targetLanguage?: string;
  rpid?: string;
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
  const [translationWarningAcknowledged, setTranslationWarningAcknowledged] =
    useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string | undefined>(
    "en",
  );
  const [rpid, setRpid] = useState<string | undefined>();

  const { rpids, isLoading: rpidsLoading, isError: rpidsError } = useRpids();

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
    setEnablePiiRedaction(d.checked);
  };

  const onGenerateSummaryChange = (d: CheckedChangeDetails) => {
    setGenerateSummary(d.checked);
  };

  const onEnableTranslationChange = (d: CheckedChangeDetails) => {
    setEnableTranslation(d.checked);
    if (!d.checked) {
      setTargetLanguage(undefined);
      setTranslationWarningAcknowledged(false);
    }
  };

  const languageSizeLimitAchieved = languages.length === MAX_LANGUAGE_LIMIT;
  const languageSizeLimitExceeded = languages.length > MAX_LANGUAGE_LIMIT;
  const piiLanguageValid = languages.length === 1 && languages[0] === "en-US";

  useEffect(() => {
    const valid =
      !!rpid &&
      !languageSizeLimitExceeded &&
      !(enableTranslation && !targetLanguage) &&
      !(enablePiiRedaction && !piiLanguageValid);
    onChange({
      props: {
        languages,
        enablePiiRedaction,
        generateSummary,
        targetLanguage: enableTranslation ? targetLanguage : undefined,
        rpid,
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
    rpid,
    piiLanguageValid,
    onChange,
    languageSizeLimitExceeded,
  ]);

  return (
    <Stack direction={direction} gap={6} alignSelf={"stretch"}>
      <Field invalid={rpidsError} alignItems={"flex-start"} gap={1.5}>
        <Heading as={"h3"} size={"md"}>
          Research Project
        </Heading>
        <Text fontSize={"sm"} color={"fg.muted"}>
          Every transcription must be assigned to one of your research projects.
          Your Research Project IDs (RPIDs) are sourced from the{" "}
          <ExternalLink href={"https://data-mgmt-plan.qut.edu.au/"}>
            Data Management Planning tool
          </ExternalLink>
          .
        </Text>
        <Stack
          direction={{ base: "column", sm: "row" }}
          gap={{ base: 1.5, sm: 3 }}
          align={{ base: "stretch", sm: "center" }}
          width={"full"}
        >
          <Text fontSize={"sm"} fontWeight={"medium"} whiteSpace={"nowrap"}>
            Research Project ID
          </Text>
          <Box flex={"1"} minWidth={0} width={"full"}>
            <RpidInput
              rpids={rpids}
              value={rpid}
              onChange={setRpid}
              isLoading={rpidsLoading}
              placeholder={"Select a research project..."}
            />
          </Box>
        </Stack>
        {rpidsError && (
          <Alert
            status={"error"}
            title={"Your research projects could not be retrieved."}
          >
            <Text>
              Please try again later. If the problem persists, contact eResearch
              support.
            </Text>
          </Alert>
        )}
        {!rpidsError && !rpidsLoading && rpids?.length === 0 && (
          <Alert status={"warning"} title={"You have no research projects."}>
            <Text>
              A Research Project ID (RPID) is required to use this service.
              Create a data management plan in the{" "}
              <ExternalLink href={"https://data-mgmt-plan.qut.edu.au/"}>
                Data Management Planning tool
              </ExternalLink>{" "}
              to obtain one.
            </Text>
          </Alert>
        )}
      </Field>
      <Field
        invalid={languageSizeLimitExceeded}
        alignItems={"flex-start"}
        gap={1.5}
      >
        <Heading as={"h3"} size={"md"}>
          Source Languages
        </Heading>
        <Text fontSize={"sm"} color={"fg.muted"}>
          Specify up to five (5) languages spoken in your audio files.
        </Text>
        <Stack
          direction={{ base: "column", sm: "row" }}
          gap={{ base: 1.5, sm: 3 }}
          align={{ base: "stretch", sm: "center" }}
          width={"full"}
        >
          <Text fontSize={"sm"} fontWeight={"medium"} whiteSpace={"nowrap"}>
            Source languages
          </Text>
          <Box flex={"1"} minWidth={0} width={"full"}>
            <LanguageInput
              isMulti={true}
              value={languages}
              onChange={onLanguageChange}
              maxSize={MAX_LANGUAGE_LIMIT}
              invalid={languageSizeLimitExceeded}
            />
          </Box>
        </Stack>
        {languageSizeLimitAchieved && (
          <ChakraField.HelperText whiteSpace={"nowrap"}>
            A maximum of {MAX_LANGUAGE_LIMIT} languages is allowed.
          </ChakraField.HelperText>
        )}
      </Field>
      <Field alignItems={"flex-start"} gap={1.5}>
        <Heading as={"h3"} size={"md"}>
          Translation Language
        </Heading>
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
        <NewFeature show={showNewFeature("ERP-4884")}>
          <Switch
            checked={enableTranslation}
            onCheckedChange={onEnableTranslationChange}
            flexDirection={"row-reverse"}
            justifyContent={"flex-end"}
          >
            Translate
          </Switch>
        </NewFeature>
        {enableTranslation && !translationWarningAcknowledged && (
          <Alert
            status={"warning"}
            title={"Translations take longer than transcription."}
          >
            <Text>
              Translation only starts once transcription has finished, so allow
              at least 15 minutes for translated results to be ready. You
              don&apos;t need to stay on this page while you wait.
            </Text>
            <Button
              size={"xs"}
              colorPalette={"blue"}
              mt={2}
              onClick={() => setTranslationWarningAcknowledged(true)}
            >
              I understand
            </Button>
          </Alert>
        )}
        {enableTranslation && (
          <Stack
            direction={{ base: "column", sm: "row" }}
            gap={{ base: 1.5, sm: 3 }}
            align={{ base: "stretch", sm: "center" }}
            width={"full"}
          >
            <Text fontSize={"sm"} fontWeight={"medium"} whiteSpace={"nowrap"}>
              Target language
            </Text>
            <Box minWidth={{ base: "auto", sm: "15rem" }} width={"full"}>
              <TranslationLanguageInput
                value={targetLanguage}
                onChange={(value) => setTargetLanguage(value)}
                placeholder={"Select a language..."}
              />
            </Box>
          </Stack>
        )}
        {enableTranslation && !targetLanguage && (
          <ChakraField.HelperText whiteSpace={"nowrap"}>
            Select a language to translate into.
          </ChakraField.HelperText>
        )}
      </Field>
      <Field alignItems={"flex-start"} gap={1.5}>
        <Heading as={"h3"} size={"md"}>
          PII Redaction
        </Heading>
        <Text fontSize={"sm"} color={"fg.muted"}>
          PII includes names, addresses, phone numbers, and credit card
          information. When PII redaction is enabled, identified instances of
          PII will be replaced with <Code>[PII]</Code> in the transcription.
        </Text>
        <Switch
          checked={enablePiiRedaction}
          onCheckedChange={onEnablePiiRedactionChange}
          flexDirection={"row-reverse"}
          justifyContent={"flex-end"}
        >
          Redact <abbr title={"Personally Identifiable Information"}>PII</abbr>
        </Switch>
        {enablePiiRedaction && !piiLanguageValid && (
          <Alert
            status={"warning"}
            title={
              <>
                PII Redaction is only available for <q>English, US</q>.
              </>
            }
          >
            <Button
              size={"xs"}
              colorPalette={"blue"}
              mt={2}
              onClick={() => setLanguages(["en-US"])}
            >
              Use <q>English, US</q>
            </Button>
          </Alert>
        )}
      </Field>
      <Field alignItems={"flex-start"} gap={1.5}>
        <Heading as={"h3"} size={"md"}>
          AI Summary
        </Heading>
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
            Anthropic&apos;s Usage Policy
          </ExternalLink>{" "}
          . Please be aware that factual assertions in the output should not be
          relied upon without independently checking their accuracy, as they may
          be false, incomplete, misleading or not reflective of recent events or
          information.
        </Text>
        <Switch
          checked={generateSummary}
          onCheckedChange={onGenerateSummaryChange}
          flexDirection={"row-reverse"}
          justifyContent={"flex-end"}
        >
          Generate Summary
        </Switch>
      </Field>
    </Stack>
  );
};

export default TranscriptionOptions;
