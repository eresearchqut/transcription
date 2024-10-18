import { ChangeEvent, FunctionComponent, useState } from "react";
import { Stack } from "@chakra-ui/layout";
import { FilePicker, FilePickerProps } from "../../inputs/filePicker";
import { Accept } from "react-dropzone";
import {
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  HStack,
  Switch,
  VStack,
} from "@chakra-ui/react";
import { LanguageInput } from "../../inputs/languageInput";
import { isArray } from "lodash";

export interface TranscribeProps {
  languages: string[];
  enablePiiRedaction: boolean;
}

export interface MediaUploadProps {
  onSubmit: (transcribeProps: TranscribeProps, files: File[]) => void;
}

const SUPPORTED_MIME_TYPES = [
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "application/ogg",
  "audio/ogg",
  "video/ogg",
  "video/webm",
  "audio/webm",
  "audio/amr",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/wav",
  "audio/wave",
  "audio/x-pn-wav",
];

const accept: Accept = {}; // specify the type of accept
SUPPORTED_MIME_TYPES.forEach((mimeType) => {
  accept[mimeType] = [];
});

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
    setEnablePiiRedaction(isChecked);
  };

  const onFilesPicked = (files: File[]) => {
    onSubmit({ languages, enablePiiRedaction }, files);
  };

  const filePickerProps: FilePickerProps = {
    accept,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxDuration: { hours: 4 },
    storageDuration: { days: 12 },
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
            <VStack alignItems={"start"}>
              <LanguageInput
                inputId={"languages"}
                isMulti={true}
                value={languages}
                isDisabled={enablePiiRedaction}
                onChange={onLanguageChange}
              />
              <FormErrorMessage>
                Maximum {MAX_LANGUAGE_LIMIT} allowed.
              </FormErrorMessage>
            </VStack>
          </FormControl>
        </HStack>
      </Flex>
      <FilePicker {...filePickerProps} />
    </Stack>
  );
};

export default MediaUpload;
