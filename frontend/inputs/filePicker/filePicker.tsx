import {
  FunctionComponent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";
import {
  Box,
  Button,
  Group,
  Heading,
  HStack,
  IconButton,
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
  onSelectionChange?(files: File[]): void;
  hideUploadButton?: boolean;
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

const isSameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

export const FilePicker: FunctionComponent<FilePickerProps> = (props) => {
  const {
    disabled,
    onFilesPicked,
    onSelectionChange,
    hideUploadButton,
    maxFiles,
    heading = "Drag and drop files here or select files to upload",
    description,
  } = props;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rejected, setRejected] = useState<FileMeta[]>([]);

  useEffect(() => {
    onSelectionChange?.(selectedFiles);
  }, [selectedFiles, onSelectionChange]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const rejectedMeta: FileMeta[] = rejectedFiles.map(
        ({ file, errors }) => ({
          name: file.name,
          size: bytesToSize(file.size),
          errors: errors.map((fileError) => fileError.message),
        }),
      );

      setSelectedFiles((current) => {
        const merged = [...current];
        for (const file of acceptedFiles) {
          if (merged.some((existing) => isSameFile(existing, file))) {
            continue;
          }
          if (maxFiles && merged.length >= maxFiles) {
            rejectedMeta.push({
              name: file.name,
              size: bytesToSize(file.size),
              errors: [`You can only upload up to ${maxFiles} files`],
            });
            continue;
          }
          merged.push(file);
        }
        return merged;
      });

      setRejected(rejectedMeta);
    },
    [maxFiles],
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    disabled,
    ...props,
  });
  const { size: _nativeSize, ...chakraInputProps } = getInputProps();

  const removeFile = (file: File) => {
    setSelectedFiles((current) =>
      current.filter((existing) => !isSameFile(existing, file)),
    );
  };

  const onUpload = () => {
    if (selectedFiles.length === 0) {
      return;
    }
    onFilesPicked(selectedFiles);
    setSelectedFiles([]);
    setRejected([]);
  };

  return (
    <Stack gap={[2, 4]}>
      {rejected.map((file, index) => (
        <Alert
          status={"error"}
          variant="outline"
          key={index}
          icon={<MappedIcon icon={"file-alert"} />}
          title={file.name}
        >
          {file.errors?.join(", ")}
        </Alert>
      ))}
      <Box {...getRootProps()} borderStyle={"dashed"} borderWidth={4} p={4}>
        <Input {...chakraInputProps} />
        <VStack gap={8} textAlign={"center"}>
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
            variant={"outline"}
            disabled={disabled}
          >
            Choose files <MappedIcon icon={"plus"} />
          </Button>
        </VStack>
      </Box>

      {selectedFiles.length > 0 && (
        <Stack gap={2}>
          <Heading size={"sm"}>Selected files ({selectedFiles.length})</Heading>
          <Stack gap={2}>
            {selectedFiles.map((file) => (
              <HStack
                key={`${file.name}-${file.size}-${file.lastModified}`}
                justifyContent={"space-between"}
                borderWidth={1}
                borderRadius={"md"}
                px={3}
                py={2}
              >
                <HStack gap={3} minW={0}>
                  <MappedIcon icon={"file"} boxSize={5} flexShrink={0} />
                  <Text truncate>{file.name}</Text>
                  <Text color={"fg.muted"} flexShrink={0}>
                    {bytesToSize(file.size)}
                  </Text>
                </HStack>
                <IconButton
                  aria-label={`Remove ${file.name}`}
                  variant={"ghost"}
                  size={"sm"}
                  disabled={disabled}
                  onClick={() => removeFile(file)}
                >
                  <MappedIcon icon={"trash"} />
                </IconButton>
              </HStack>
            ))}
          </Stack>
          {!hideUploadButton && (
            <Group justifyContent={"flex-end"}>
              <Button
                onClick={onUpload}
                colorPalette={"blue"}
                variant={"solid"}
                disabled={disabled || selectedFiles.length === 0}
              >
                Upload <MappedIcon icon={"upload"} />
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default FilePicker;
