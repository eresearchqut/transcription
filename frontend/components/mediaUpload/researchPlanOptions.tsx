"use client";

import {
  Box,
  Field as ChakraField,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type FunctionComponent, useEffect, useState } from "react";
import { ExternalLink } from "@/components/externalLink";
import { Field } from "@/components/ui/field";
import { useRpids } from "../../hooks/useRpids";
import { RpidAlerts, RpidInput } from "../../inputs/rpidInput";
import { activeRpid, DMP_URL } from "../../utils/dmp";

export interface ResearchPlanValue {
  rpid?: string;
  valid: boolean;
  /** What the user must still do for the plan to be valid. */
  problems: string[];
}

export interface ResearchPlanOptionsProps {
  onChange: (value: ResearchPlanValue) => void;
}

export const ResearchPlanOptions: FunctionComponent<
  ResearchPlanOptionsProps
> = ({ onChange }) => {
  const [selectedRpid, setRpid] = useState<string | undefined>();
  const rpidsState = useRpids();
  const { rpids, isLoading, isError } = rpidsState;
  const rpid = activeRpid(rpids, selectedRpid);

  const problem = rpid
    ? undefined
    : isLoading
      ? "Wait for your research plans to load."
      : isError
        ? "Your research plans could not be retrieved."
        : rpids?.length === 0
          ? "You have no active research plans."
          : "Select a plan.";

  useEffect(() => {
    onChange({ rpid, valid: !problem, problems: problem ? [problem] : [] });
  }, [rpid, problem, onChange]);

  return (
    <Field invalid={isError} required alignItems={"flex-start"} gap={1.5}>
      <Heading as={"h3"} size={"md"}>
        Data Management Plan
      </Heading>
      <Text fontSize={"sm"} color={"fg.muted"}>
        Every transcription must be associated with a Data Management Plan from
        the <ExternalLink href={DMP_URL}>Data Management Planner</ExternalLink>,
        identified by its Research Plan Identifier (RPID).
      </Text>
      <Stack
        direction={{ base: "column", sm: "row" }}
        gap={{ base: 1.5, sm: 3 }}
        align={{ base: "stretch", sm: "center" }}
        width={"full"}
      >
        <ChakraField.Label
          fontSize={"sm"}
          fontWeight={"medium"}
          whiteSpace={"nowrap"}
        >
          Data Management Plan
          <ChakraField.RequiredIndicator />
        </ChakraField.Label>
        <Box flex={"1"} minWidth={0} width={"full"}>
          <RpidInput
            rpids={rpids}
            value={rpid}
            onChange={setRpid}
            isLoading={isLoading}
            placeholder={"Select a plan..."}
          />
        </Box>
      </Stack>
      <RpidAlerts {...rpidsState} />
    </Field>
  );
};

export default ResearchPlanOptions;
