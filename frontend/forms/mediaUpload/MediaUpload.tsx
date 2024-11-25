import { ChangeEvent, FunctionComponent, useState } from "react";
import { Stack } from "@chakra-ui/layout";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import {
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Switch,
} from "@chakra-ui/react";
import { LanguageInput } from "../../inputs/languageInput";
import { isArray } from "lodash";
import { TRANSCRIBE_QUOTAS } from "../../model";
import { HelpPopover } from "../../components/helpPopover";

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

  const onEnablePiiRedactionChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
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
    <Stack align={"stretch"} spacing={[0, 4]}>
      <Flex alignItems={"center"} gap={4}>
        <Heading size={"sm"} as={"h2"}>
          Options:
        </Heading>
        <HStack spacing={8}>
          <FormControl
            display={"flex"}
            minWidth={"max-content"}
            gap={2}
            alignItems={"center"}
          >
            <FormLabel m={0}>
              Redact{" "}
              <abbr title={"Personally Identifiable Information"}>PII</abbr>
            </FormLabel>
            <Switch
              isChecked={enablePiiRedaction}
              onChange={onEnablePiiRedactionChange}
            />
            <HelpPopover
              ariaLabel={"Help with Redact PII"}
              header={"Redact Personally Identifiable Information (PII)"}
            >
              PII includes names, addresses, phone numbers, and credit card
              information. When PII redaction is enabled, identified instances
              of PII will be replaced with <Code>[PII]</Code> in the
              transcription.
            </HelpPopover>
          </FormControl>
          <FormControl
            display={"flex"}
            minWidth={"max-content"}
            alignItems={"center"}
            gap={2}
            isInvalid={languageSizeLimitExceeded}
          >
            <FormLabel
              m={0}
              as={enablePiiRedaction ? "h3" : undefined}
              htmlFor={!enablePiiRedaction ? "languages" : undefined}
            >
              Languages
            </FormLabel>
            <HStack alignItems={"center"}>
              <LanguageInput
                inputId={"languages"}
                isMulti={true}
                value={languages}
                isDisabled={enablePiiRedaction}
                onChange={onLanguageChange}
                maxSize={MAX_LANGUAGE_LIMIT}
                isInvalid={languageSizeLimitExceeded}
              />
              <HelpPopover
                ariaLabel={"Help with Languages"}
                header={"Languages"}
              >
                Specify up to five (5) languages spoken in your audio files.
              </HelpPopover>
              <FormHelperText mt={0} hidden={!enablePiiRedaction}>
                PII Redaction only available for English, US.
              </FormHelperText>
              <FormHelperText mt={0} hidden={!languageSizeLimitAchieved}>
                A maximum of {MAX_LANGUAGE_LIMIT} languages is allowed.
              </FormHelperText>
            </HStack>
          </FormControl>
        </HStack>
      </Flex>
      <FilePicker {...filePickerProps} disabled={languageSizeLimitExceeded} />
    </Stack>
  );
};

export default MediaUpload;
