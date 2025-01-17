import { FunctionComponent, useState } from "react";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import {
  Code,
  Field as ChakraField,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LanguageInput } from "../../inputs/languageInput";
import { isArray } from "lodash";
import { TRANSCRIBE_QUOTAS } from "../../model";
import { HelpPopover } from "@/components/helpPopover";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CheckedChangeDetails } from "@zag-js/switch";

export interface TranscribeProps {
  languages: string[];
  enablePiiRedaction: boolean;
}

export interface MediaUploadProps {
  onSubmit: (transcribeProps: TranscribeProps, files: File[]) => void;
}

export const MediaUpload: FunctionComponent<MediaUploadProps> = ({
  onSubmit,
}) => {
  const [languages, setLanguages] = useState<string[]>(["en-AU"]);
  const [enablePiiRedaction, setEnablePiiRedaction] = useState<boolean>(false);

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

  const onFilesPicked = (files: File[]) => {
    onSubmit({ languages, enablePiiRedaction }, files);
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
        <Heading size={"sm"} as={"h2"}>
          Options:
        </Heading>
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
            inputId={"languages"}
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
