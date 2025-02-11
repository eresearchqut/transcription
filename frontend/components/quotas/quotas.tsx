import { FunctionComponent } from "react";
import { formatDuration } from "date-fns";
import { Heading, Stack, StackSeparator, Text } from "@chakra-ui/react";
import { bytesToSize } from "../../inputs/filePicker";
import { isEmpty, lowerFirst, upperFirst } from "lodash";
import { TranscribeQuotaProps } from "model";

export interface QuotasProps extends Omit<TranscribeQuotaProps, "accept"> {
  asTextOnly?: boolean;
}

const QuotasAsText: FunctionComponent<Omit<QuotasProps, "asTextOnly">> = ({
  minimumDuration,
  maximumDuration,
  maximumFileSizeBytes,
  maximumFilesCount,
  storageDuration,
  supportedFileFormats,
}) => {
  const readableJoin = (items: any[]) =>
    (items.length > 1
      ? [items.slice(0, -1).join(", "), ` and ${items.at(-1)}`]
      : items
    ).join("");

  const allowedFiles =
    supportedFileFormats && !isEmpty(supportedFileFormats)
      ? `You can upload ${readableJoin(supportedFileFormats)} files.`
      : undefined;

  const quotas = [
    maximumFileSizeBytes &&
      `Files can't be larger than ${bytesToSize(maximumFileSizeBytes)}`,
    maximumFilesCount && `You can upload up to ${maximumFilesCount} files`,
    minimumDuration &&
      `Minimum audio duration is ${formatDuration(minimumDuration)}`,
    maximumDuration &&
      `Maximum audio duration is ${formatDuration(maximumDuration)}`,
  ]
    .filter((i) => i)
    .map((i) => i && lowerFirst(i));

  const quotaMessage = upperFirst(readableJoin(quotas));

  return (
    <>
      {allowedFiles && <Text>{allowedFiles}</Text>}
      {quotaMessage && <Text>{quotaMessage}</Text>}
      {storageDuration && (
        <Text>
          Transcriptions will be retained for {formatDuration(storageDuration)}.
        </Text>
      )}
    </>
  );
};

export const Quotas: FunctionComponent<QuotasProps> = ({
  asTextOnly = false,
  ...props
}) => {
  if (asTextOnly) {
    return <QuotasAsText {...props} />;
  }

  const {
    minimumDuration,
    maximumDuration,
    maximumFileSizeBytes,
    storageDuration,
    supportedFileFormats,
  } = props;

  const items: Record<string, string | undefined> = {
    "Minimum duration": minimumDuration && formatDuration(minimumDuration),
    "Maximum duration": maximumDuration && formatDuration(maximumDuration),
    "Maximum file size": maximumFileSizeBytes
      ? bytesToSize(maximumFileSizeBytes)
      : undefined,
    "Storage duration": storageDuration && formatDuration(storageDuration),
    "Supported file formats": supportedFileFormats?.join(", "),
  };

  return (
    <Stack gap={2} separator={<StackSeparator />}>
      {Object.keys(items).map(
        (key) =>
          items[key] && (
            <Stack key={key} direction={["column", "row"]}>
              <Heading as={"h3"} size={"sm"} minW={"12em"}>
                {key}
              </Heading>
              <Text>{items[key]}</Text>
            </Stack>
          ),
      )}
    </Stack>
  );
};

export default Quotas;
