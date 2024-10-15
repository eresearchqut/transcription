import { FunctionComponent, useState } from "react";
import { Stack } from "@chakra-ui/layout";
import { FilePicker } from "../../components/filePicker";
import { Accept } from "react-dropzone";
import { Flex, FormControl, FormErrorMessage, FormLabel, Spacer } from "@chakra-ui/react";
import { LanguageInput } from "../../components/languageInput";
import { YesNoInput } from "../../components/yesNoInput/yesNoInput";
import { isArray } from "lodash";

export interface TranscribeProps {
  languages: string[];
  hasMultipleLanguages: boolean;
  hasIdentifiedAllLanguages: boolean;
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
  const [transcribeProps, setTranscribeProps] = useState<TranscribeProps>({
    languages: ["en-AU"],
    hasMultipleLanguages: false,
    hasIdentifiedAllLanguages: true,
    enablePiiRedaction: false,
  });

  const onLanguageChange = (selectedLanguages: any) => {
    // TODO fix typing
    console.log("Selected languages:", selectedLanguages);
    setTranscribeProps((prevProps: any) => ({
      ...prevProps,
      languages: isArray(selectedLanguages)
        ? selectedLanguages
        : [selectedLanguages],
    }));
  };

  const onHasIdentifiedAllLanguagesChange = (newValue: boolean | undefined) => {
    setTranscribeProps((prevProps: any) => ({
      ...prevProps,
      hasIdentifiedAllLanguages: newValue,
    }));
  };

  const onHasMultipleLanguagesChange = (newValue: boolean | undefined) => {
    setTranscribeProps((prevProps: any) => ({
      ...prevProps,
      hasMultipleLanguages: newValue,
    }));
  };

  const onEnablePiiRedactionChange = (newValue: boolean | undefined) => {
    setTranscribeProps((prevProps: any) => ({
      ...prevProps,
      enablePiiRedaction: newValue,
    }));
  };

  const onFilesPicked = (files: File[]) => {
    onSubmit(transcribeProps, files);
  };

  const filePickerProps = {
    accept,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    onFilesPicked,
  };

  const maxLanguageLimit = transcribeProps.hasMultipleLanguages ? 5 : 1;
  const languageSizeLimitReached =
    transcribeProps.languages.length > maxLanguageLimit;

  return (
    <Stack align={"stretch"} spacing={[0, 4]}>
      <FormControl isRequired>
        <Flex>
          <FormLabel mt={2}>
            Are there multiple languages spoken in your media?
          </FormLabel>
          <Spacer />
          <YesNoInput
            value={transcribeProps.hasMultipleLanguages}
            onChange={onHasMultipleLanguagesChange}
          />
        </Flex>
      </FormControl>
      <FormControl isRequired isInvalid={languageSizeLimitReached}>
        <FormLabel>Known language(s) spoken in media:</FormLabel>
        <LanguageInput
          isMulti={maxLanguageLimit > 1}
          defaultValue={transcribeProps.languages}
          onChange={onLanguageChange}
        />
        {languageSizeLimitReached && (
          <FormErrorMessage>
            Max {maxLanguageLimit} language(s) allowed
          </FormErrorMessage>
        )}
      </FormControl>
      <FormControl isRequired>
        <Flex>
          <FormLabel mt={2}>
            Have all the spoken languages been identified?
          </FormLabel>
          <Spacer />
          <YesNoInput
            value={transcribeProps.hasIdentifiedAllLanguages}
            onChange={onHasIdentifiedAllLanguagesChange}
          />
        </Flex>
      </FormControl>
      <FormControl isRequired>
        <Flex>
          <FormLabel mt={2}>
            Enable Personally Identifiable Information (PII) redaction
          </FormLabel>
          <Spacer />
          <YesNoInput
            value={transcribeProps.enablePiiRedaction}
            onChange={onEnablePiiRedactionChange}
          />
        </Flex>
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Media files:</FormLabel>
        <FilePicker {...filePickerProps} />
      </FormControl>
    </Stack>
  );
};

export default MediaUpload;
