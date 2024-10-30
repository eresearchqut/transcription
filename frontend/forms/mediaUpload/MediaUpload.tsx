import { ChangeEvent, FunctionComponent, useState } from "react";
import { Stack } from "@chakra-ui/layout";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import {
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Switch,
} from "@chakra-ui/react";
import { LanguageInput } from "../../inputs/languageInput";
import { isArray } from "lodash";
import { TRANSCRIBE_QUOTAS } from "../../model";

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
  const languageSizeLimitReached = languages.length > MAX_LANGUAGE_LIMIT;

  return (
    <Stack align={"stretch"} spacing={[0, 4]}>
      <Flex alignItems={"center"} gap={4}>
        <Heading size={"sm"} as={"h2"}>
          Options:
        </Heading>
        <HStack spacing={8}>
          <FormControl display={"flex"} minWidth={"max-content"} gap={2}>
            <FormLabel m={0}>
              Redact{" "}
              <abbr title={"Personally Identifiable Information"}>PII</abbr>
            </FormLabel>
            <Switch
              isChecked={enablePiiRedaction}
              onChange={onEnablePiiRedactionChange}
            />
          </FormControl>
          <FormControl
            display={"flex"}
            alignItems={"center"}
            minWidth={"80em"}
            gap={2}
            isInvalid={languageSizeLimitReached}
          >
            <FormLabel
              m={0}
              as={enablePiiRedaction ? "h3" : undefined}
              htmlFor={!enablePiiRedaction ? "languages" : undefined}
            >
              Languages
            </FormLabel>
            <HStack alignItems={"start"}>
              <LanguageInput
                inputId={"languages"}
                isMulti={true}
                value={languages}
                isDisabled={enablePiiRedaction}
                onChange={onLanguageChange}
              />
              <FormHelperText hidden={!enablePiiRedaction}>
                PII Redaction only available for English, US.
              </FormHelperText>
              <FormErrorMessage>
                Maximum {MAX_LANGUAGE_LIMIT} allowed.
              </FormErrorMessage>
            </HStack>
          </FormControl>
        </HStack>
      </Flex>
      <FilePicker {...filePickerProps} />
    </Stack>
  );
};

export default MediaUpload;
