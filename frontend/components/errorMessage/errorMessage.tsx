import { FunctionComponent, useEffect, useState } from "react";
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Box, Button, Clipboard, Text } from "@chakra-ui/react";
import { ExternalLink } from "@/components/externalLink";
import { FallbackProps, useErrorBoundary } from "react-error-boundary";
import { MappedIcon } from "@/components/mappedIcon";
import SplunkOtelWeb from "@splunk/otel-web";
import { capitalize, isEmpty, words } from "lodash";

export interface ErrorMessageProps extends FallbackProps {
  icon?: string;
  title?: string;
  message?: string;
}

type ErrorDetail = { label: string; value: string };
const clipboardText = (detail: Array<ErrorDetail>) =>
  detail.map(({ label, value }) => `${label}: ${value}`).join("\n");

const ErrorMessage: FunctionComponent<ErrorMessageProps & FallbackProps> = ({
  icon = "exclamation-circle",
  title = "An unexpected error has occurred",
  message,
  error,
}) => {
  const { resetBoundary } = useErrorBoundary();
  const [errorDetails, setErrorDetails] = useState<Array<ErrorDetail>>([]);
  useEffect(() => {
    if (error) {
      const errorDetail = error as Error & { reason?: string };
      setErrorDetails(
        () =>
          Object.entries({
            splunkSessionId: SplunkOtelWeb.getSessionId(),
            timestamp: new Date().toISOString(),
            detail:
              errorDetail?.reason?.toString() ??
              errorDetail?.message ??
              error?.toString(),
          })
            .filter(([_key, value]) => !isEmpty(value))
            .map(([key, value]) => {
              return { label: words(key)?.map(capitalize)?.join(" "), value };
            }) as Array<ErrorDetail>,
      );
    }
  }, [error]);

  return (
    <DialogRoot
      defaultOpen={true}
      onOpenChange={() => {
        resetBoundary();
      }}
      preventScroll={false}
    >
      <DialogTrigger />
      <DialogBackdrop />
      <DialogContent>
        <DialogCloseTrigger />
        <DialogHeader>
          <DialogTitle>
            {icon && <MappedIcon mb={1} icon={icon} />} {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {message && <Text>{message}</Text>}
          <Text>
            If you continue to receive this error, please{" "}
            <ExternalLink
              href={
                "https://qutvirtual4.qut.edu.au/group/research-students/conducting-research/specialty-research-facilities/advanced-research-computing-storage"
              }
            >
              contact eResearch
            </ExternalLink>{" "}
            for assistance, providing the following information:
          </Text>
          <Box
            border={"dashed"}
            borderWidth={1}
            borderColor={"gray.300"}
            p={2}
            mt={4}
            mb={4}
          >
            {errorDetails.map(({ label, value }) => (
              <Text key={label}>
                {label}: {value}
              </Text>
            ))}
          </Box>
          <Clipboard.Root value={clipboardText(errorDetails)}>
            <Clipboard.Trigger asChild>
              <Button variant="surface" size="sm">
                <Clipboard.Indicator />
                <Clipboard.CopyText />
              </Button>
            </Clipboard.Trigger>
          </Clipboard.Root>
        </DialogBody>
        <DialogFooter />
      </DialogContent>
    </DialogRoot>
  );
};

export default ErrorMessage;
