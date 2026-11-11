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
import { useFeatures } from "../../hooks/useFeatures";
import { useNewFeatureStorage } from "../../hooks/useNewFeatureStorage";
import { useRpids } from "../../hooks/useRpids";
import { LanguageInput } from "../../inputs/languageInput";
import { RpidAlerts, RpidInput } from "../../inputs/rpidInput";
import { TranslationLanguageInput } from "../../inputs/translationLanguageInput";
import { activeRpid, DMP_URL } from "../../utils/dmp";

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
  const [selectedRpid, setRpid] = useState<string | undefined>();

  const { features: featureFlags, isLoading: featuresLoading } = useFeatures();
  const rpidRequired = !!featureFlags?.rpid;
  const rpidsState = useRpids();
  const { rpids, isLoading: rpidsLoading, isError: rpidsError } = rpidsState;
  const rpid = activeRpid(rpids, selectedRpid);

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
      !featuresLoading &&
      (!rpidRequired || !!rpid) &&
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
    rpidRequired,
    featuresLoading,
    piiLanguageValid,
    onChange,
    languageSizeLimitExceeded,
  ]);

  return (
    <Stack direction={direction} gap={6} alignSelf={"stretch"}>
      {rpidRequired && (
        <Field invalid={rpidsError} alignItems={"flex-start"} gap={1.5}>
          <Heading as={"h3"} size={"md"}>
            Research Project
          </Heading>
          <Text fontSize={"sm"} color={"fg.muted"}>
            Every transcription must be assigned to one of your research
            projects. Your Research Project IDs (RPIDs) are sourced from the{" "}
            <ExternalLink href={DMP_URL}>
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
          <RpidAlerts {...rpidsState} />
        </Field>
      )}
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
          This service uses{" "}
          <ExternalLink href={"https://aws.amazon.com/bedrock/"}>
            Amazon Bedrock
          </ExternalLink>{" "}
          with Claude Haiku 5.5 to summarise your transcript in the AWS Sydney
          or Melbourne region. AWS may automatically check inputs and outputs
          for violations of its{" "}
          <ExternalLink href={"https://aws.amazon.com/aup/"}>
            Acceptable Use
          </ExternalLink>{" "}
          and{" "}
          <ExternalLink
            href={"https://aws.amazon.com/ai/responsible-ai/policy/"}
          >
            Responsible AI
          </ExternalLink>{" "}
          policies and{" "}
          <ExternalLink href={"https://www.anthropic.com/legal/aup"}>
            Anthropic&apos;s Usage Policy
          </ExternalLink>
          . When you enable summaries, you must comply with these policies and{" "}
          <ExternalLink
            href={"https://aws.amazon.com/legal/bedrock/third-party-models/"}
          >
            Anthropic&apos;s Bedrock terms
          </ExternalLink>
          . Independently check factual claims before using or sharing a
          summary, as they may be false, incomplete, misleading or out of date.
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
