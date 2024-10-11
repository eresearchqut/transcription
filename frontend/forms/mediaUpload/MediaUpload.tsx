import { FunctionComponent } from "react";
import { Stack, Text } from "@chakra-ui/layout";
import { FilePicker } from "../../components/filePicker";
import { Accept } from "react-dropzone";
import { FormControl, FormLabel } from "@chakra-ui/react";
import { Input } from "@chakra-ui/input";

export interface MediaUploadProps {}

const onFilesPicked = (files: File[]) => {
  console.log(`uploaded ${files.length} file(s).`);
};

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
const filePickerProps = {
  accept,
  maxSize: 2 * 1024 * 1024 * 1024, // 2GB
  onFilesPicked,
};

export const MediaUpload: FunctionComponent<MediaUploadProps> = (props) => {
  return (
    <Stack>
      <FormControl isRequired>
        <FormLabel>Media files:</FormLabel>
        <FilePicker {...filePickerProps} />
      </FormControl>
    </Stack>
  );
};

export default MediaUpload;
