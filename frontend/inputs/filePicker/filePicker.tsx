import { FunctionComponent, useCallback, useState } from "react";
import { DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Heading,
  Icon,
  Stack,
  VStack,
} from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";
import { TbFileAlert } from "react-icons/tb";
import { Input } from "@chakra-ui/input";
import { AddIcon } from "@chakra-ui/icons";
import { Quotas } from "../../components/quotas";
import { TRANSCRIBE_QUOTAS } from "../../model";

export interface FilePickerProps
  extends Pick<
    DropzoneOptions,
    "accept" | "maxFiles" | "maxSize" | "validator" | "disabled"
  > {
  onFilesPicked(files: File[]): void;
}

export const bytesToSize = (bytes: number, precision = 0): string => {
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;
  const terabyte = gigabyte * 1024;

  if (bytes >= 0 && bytes < kilobyte) {
    return bytes + " B";
  } else if (bytes >= kilobyte && bytes < megabyte) {
    return (bytes / kilobyte).toFixed(precision) + "KB";
  } else if (bytes >= megabyte && bytes < gigabyte) {
    return (bytes / megabyte).toFixed(precision) + "MB";
  } else if (bytes >= gigabyte && bytes < terabyte) {
    return (bytes / gigabyte).toFixed(precision) + "GB";
  } else if (bytes >= terabyte) {
    return (bytes / terabyte).toFixed(precision) + "TB";
  } else {
    return bytes + " B";
  }
};

interface FileMeta {
  name: string;
  size?: string;
  errors?: string[];
}

interface UploadStatus {
  accepted: FileMeta[];
  rejected: FileMeta[];
}

export const FilePicker: FunctionComponent<FilePickerProps> = (props) => {
  const { disabled, onFilesPicked } = props;

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    accepted: [],
    rejected: [],
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setUploadStatus(() => ({
        accepted: acceptedFiles.map((file) => ({
          name: file.name,
          size: bytesToSize(file.size),
        })),
        rejected: rejectedFiles.map(({ file, errors }) => ({
          name: file.name,
          size: bytesToSize(file.size),
          errors: errors.map((fileError) => fileError.message),
        })),
      }));
      onFilesPicked(acceptedFiles);
    },
    [onFilesPicked],
  );
  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    disabled,
    ...props,
  });
  const { size: nativeSize, ...chakraInputProps } = getInputProps();

  return (
    <Stack spacing={[2, 4]}>
      {uploadStatus.rejected &&
        uploadStatus.rejected.map((rejected, index) => (
          <Alert status={"error"} variant="left-accent" key={index}>
            <AlertIcon as={TbFileAlert} boxSize={[10, 12]} />
            <Box>
              <AlertTitle>{rejected.name}</AlertTitle>
              <AlertDescription>{rejected.errors?.join(", ")}</AlertDescription>
            </Box>
          </Alert>
        ))}
      <Box {...getRootProps()} borderStyle={"dashed"} borderWidth={4} p={4}>
        <Input {...chakraInputProps} />
        <VStack spacing={8}>
          <Icon as={LuUpload} boxSize={[10, 20]} />
          <Heading>Drag and drop files here or select files to upload</Heading>
          <Stack spacing={0} alignItems={"center"}>
            <Quotas asTextOnly={true} {...TRANSCRIBE_QUOTAS} />
          </Stack>
          <Button
            onClick={open}
            colorScheme={"blue"}
            variant={"solid"}
            rightIcon={<AddIcon />}
            isDisabled={disabled}
          >
            Upload
          </Button>
        </VStack>
      </Box>
    </Stack>
  );
};

export default FilePicker;
