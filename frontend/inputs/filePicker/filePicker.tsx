import { FunctionComponent, ReactNode, useCallback, useState } from "react";
import { DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Quotas } from "../../components/quotas";
import { TRANSCRIBE_QUOTAS } from "model";
import { Alert } from "@/components/ui/alert";
import { MappedIcon } from "@/components/mappedIcon";

export interface FilePickerProps
  extends Pick<
    DropzoneOptions,
    "accept" | "maxFiles" | "maxSize" | "validator" | "disabled"
  > {
  onFilesPicked(files: File[]): void;
  heading?: ReactNode;
  description?: ReactNode;
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
  const {
    disabled,
    onFilesPicked,
    heading = "Drag and drop files here or select files to upload",
    description,
  } = props;

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    accepted: [],
    rejected: [],
  });

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      onFilesPicked(acceptedFiles);
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
    <Stack gap={[2, 4]}>
      {uploadStatus.rejected &&
        uploadStatus.rejected.map((rejected, index) => (
          <Alert
            status={"error"}
            variant="outline"
            key={index}
            icon={<MappedIcon icon={"file-alert"} />}
            title={rejected.name}
          >
            {rejected.errors?.join(", ")}
          </Alert>
        ))}
      <Box {...getRootProps()} borderStyle={"dashed"} borderWidth={4} p={4}>
        <Input {...chakraInputProps} />
        <VStack gap={8}>
          <MappedIcon icon={"upload"} boxSize={[10, 20]} />
          <Heading>{heading}</Heading>
          {description && <Text textAlign={"center"}>{description}</Text>}
          <Stack gap={0} alignItems={"center"}>
            <Quotas
              asTextOnly={true}
              showSupportedFormats={false}
              {...TRANSCRIBE_QUOTAS}
            />
          </Stack>
          <Button
            onClick={open}
            colorPalette={"blue"}
            variant={"solid"}
            disabled={disabled}
          >
            Upload <MappedIcon icon={"plus"} />
          </Button>
        </VStack>
      </Box>
    </Stack>
  );
};

export default FilePicker;
