import { Text } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { ExternalLink } from "@/components/externalLink";
import { Alert } from "@/components/ui/alert";
import type { UseRpidsState } from "../../hooks/useRpids";
import { DMP_URL } from "../../utils/dmp";

/** Explains why there is no RPID to choose when the user's list is unavailable or empty. */
export const RpidAlerts: FunctionComponent<UseRpidsState> = ({
  rpids,
  isLoading,
  isError,
}) => {
  if (isError) {
    return (
      <Alert
        status={"error"}
        title={"Your research projects could not be retrieved."}
      >
        <Text>
          A Research Project ID (RPID) is required to use this service. Please
          try again later. If the problem persists, contact eResearch support.
        </Text>
      </Alert>
    );
  }
  if (!isLoading && rpids?.length === 0) {
    return (
      <Alert status={"warning"} title={"You have no active research projects."}>
        <Text>
          A Research Project ID (RPID) is required to use this service. Create a
          data management plan in the{" "}
          <ExternalLink href={DMP_URL}>
            Data Management Planning tool
          </ExternalLink>
          , or ask the lead of a project you work on to add you to its plan.
        </Text>
      </Alert>
    );
  }
  return null;
};

export default RpidAlerts;
