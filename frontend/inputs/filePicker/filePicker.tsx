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
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";
import { TbFileAlert } from "react-icons/tb";
import { Input } from "@chakra-ui/input";
import { AddIcon } from "@chakra-ui/icons";
import { Duration, formatDuration } from "date-fns";
import { lowerFirst, upperFirst } from "lodash";

export interface FilePickerProps
  extends Pick<
    DropzoneOptions,
    "accept" | "maxFiles" | "maxSize" | "validator"
  > {
  minDuration?: Duration;
  maxDuration?: Duration;
  storageDuration?: Duration;
  onFilesPicked(files: File[]): void;
}

export interface FilePickerState {
  files: File[];
  fileNames: string[];
}

const bytesToSize = (bytes: number, precision = 0): string => {
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
  const {
    accept,
    maxFiles,
    maxSize,
    maxDuration,
    minDuration,
    storageDuration,
    onFilesPicked,
  } = props;

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
    ...props,
  });
  const { size: nativeSize, ...chakraInputProps } = getInputProps();

  const acceptedFileExtensions = accept
    ? Object.values(accept).flat(1).join(", ")
    : undefined;

  const supportedFileFormats = accept
    ? Array.from(
        new Set(
          Object.keys(accept).map(
            (mimeType) => mimeType.split(/[/.-]/).at(-1) ?? "",
          ),
        ).values(),
      )
    : [];

  const allowedFiles = acceptedFileExtensions
    ? `You can upload ${acceptedFileExtensions} files.`
    : supportedFileFormats
      ? `You can upload ${supportedFileFormats.join(", ")} files.`
      : undefined;

  const quotas = [
    maxSize && `Files can't be larger than ${bytesToSize(maxSize)}`,
    maxFiles && `You can upload up to ${maxFiles} files`,
    minDuration && `Minimum audio duration is ${formatDuration(minDuration)}`,
    maxDuration && `Maximum audio duration is ${formatDuration(maxDuration)}`,
  ]
    .filter((i) => i)
    .map((i) => i && lowerFirst(i));

  const quotaMessage = upperFirst(
    (quotas.length > 1
      ? [quotas.slice(0, -1).join(", "), ` and ${quotas.at(-1)}`]
      : quotas
    ).join(""),
  );

  return (
    <Stack spacing={[2, 4]}>
      <Box {...getRootProps()} borderStyle={"dashed"} borderWidth={4} p={4}>
        <Input {...chakraInputProps} />
        <VStack spacing={8}>
          <Icon as={LuUpload} boxSize={[10, 20]} />
          <Heading>Drag and drop files here or select files to upload</Heading>
          <Stack spacing={0} alignItems={"center"}>
            {allowedFiles && <Text>{allowedFiles}</Text>}
            {quotaMessage && <Text>{quotaMessage}</Text>}
            {storageDuration && (
              <Text>
                Transcriptions will be retained for{" "}
                {formatDuration(storageDuration)}.
              </Text>
            )}
          </Stack>
          <Button
            onClick={open}
            colorScheme={"blue"}
            variant={"solid"}
            rightIcon={<AddIcon />}
          >
            Upload
          </Button>
        </VStack>
      </Box>
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
    </Stack>
  );
};

export default FilePicker;
