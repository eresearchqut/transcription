import { Fragment, FunctionComponent } from "react";
import { Heading, HStack, StackDivider, Text } from "@chakra-ui/react";
import { Stack } from "@chakra-ui/layout";

export interface UploadQuotaProps {
  minimumDuration?: string;
  maximumDuration?: string;
  maximumFilesize?: string;
  storageDuration?: string;
  supportedFileFormats?: string[];
}

const UploadQuota: FunctionComponent<UploadQuotaProps> = ({
  minimumDuration,
  maximumDuration,
  maximumFilesize,
  storageDuration,
  supportedFileFormats,
}) => {
  const items = [
    { title: "Minimum duration", value: minimumDuration },
    { title: "Maximum duration", value: maximumDuration },
    { title: "Maximum file size", value: maximumFilesize },
    { title: "Storage duration", value: storageDuration },
    supportedFileFormats
      ? {
          title: "Supported file formats",
          value: supportedFileFormats.join(", "),
        }
      : undefined,
  ].filter((i) => i);
  return (
    items && (
      <Stack spacing={2} divider={<StackDivider />}>
        {items.map((item) => {
          const { title, value } = item!;
          return (
            <Fragment key={title}>
              <HStack>
                <Heading size={"sm"} as={"h5"} width={"15em"}>
                  {title}
                </Heading>
                <Text>{value}</Text>
              </HStack>
            </Fragment>
          );
        })}
      </Stack>
    )
  );
};

export default UploadQuota;
