import { FunctionComponent } from "react";
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
import { Text } from "@chakra-ui/react";
import { ExternalLink } from "@/components/externalLink";
import { FallbackProps, useErrorBoundary } from "react-error-boundary";
import { MappedIcon } from "@/components/mappedIcon";

export interface ErrorMessageProps extends FallbackProps {
  icon?: string;
  title?: string;
  message?: string;
}

const ErrorMessage: FunctionComponent<ErrorMessageProps & FallbackProps> = ({
  icon = "exclamation-circle",
  title = "An unexpected error has occurred",
  message,
}) => {
  const { resetBoundary } = useErrorBoundary();

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
            for assistance.
          </Text>
        </DialogBody>
        <DialogFooter />
      </DialogContent>
    </DialogRoot>
  );
};

export default ErrorMessage;
