import { Badge, HStack, Stack, Text, Wrap } from "@chakra-ui/react";
import { Select, type Props as SelectProps } from "chakra-react-select";
import type { Rpid, RpidOrganisation, RpidResearcher } from "model";
import type { FunctionComponent } from "react";
import { OptionBadge } from "@/components/mediaUpload/optionsSummary";

export interface RpidInputProps
  extends Omit<SelectProps, "options" | "onChange" | "value"> {
  rpids?: Rpid[];
  value?: string;
  onChange?: (newValue: string | undefined) => void;
}

interface RpidOption {
  label: string;
  value: string;
  rpid: Rpid;
}

export const rpidLabel = (rpid: Rpid): string =>
  rpid.title ? `${rpid.encodedId}: ${rpid.title}` : (rpid.encodedId ?? "");

const researcherName = (researcher?: RpidResearcher): string | undefined =>
  researcher?.preferredName || researcher?.name;

export const organisationName = (rpid: Rpid): string | undefined => {
  const { organisation } = rpid;
  if (!organisation) {
    return undefined;
  }
  if (typeof (organisation as RpidOrganisation).name === "string") {
    return (organisation as RpidOrganisation).name;
  }
  return Object.values(organisation as Record<string, RpidOrganisation>)
    .map((org) => org?.name)
    .find((name) => !!name);
};

const statusColorPalette = (status?: string): string => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "green";
    case "CLOSED":
      return "gray";
    default:
      return "orange";
  }
};

const RpidOptionLabel: FunctionComponent<{
  rpid: Rpid;
  context: "menu" | "value";
}> = ({ rpid, context }) => {
  if (context === "value") {
    return <>{rpidLabel(rpid)}</>;
  }
  const details = [
    researcherName(rpid.lead) && {
      label: "Lead",
      value: researcherName(rpid.lead) as string,
    },
    researcherName(rpid.supervisor) && {
      label: "Supervisor",
      value: researcherName(rpid.supervisor) as string,
    },
    organisationName(rpid) && {
      label: "Organisation",
      value: organisationName(rpid) as string,
    },
  ].filter(Boolean) as { label: string; value: string }[];
  return (
    <Stack gap={1}>
      <HStack gap={2}>
        <Text as={"span"} fontWeight={"medium"}>
          {rpidLabel(rpid)}
        </Text>
        {rpid.status && (
          <Badge colorPalette={statusColorPalette(rpid.status)} size={"sm"}>
            {rpid.status}
          </Badge>
        )}
      </HStack>
      {details.length > 0 && (
        <Wrap gap={1}>
          {details.map(({ label, value }) => (
            <OptionBadge key={label} label={label} value={value} />
          ))}
        </Wrap>
      )}
    </Stack>
  );
};

export const RpidInput: FunctionComponent<RpidInputProps> = ({
  rpids,
  onChange: onChangeProp,
  value,
  ...props
}) => {
  const rpidOptions: RpidOption[] = (rpids ?? [])
    .filter((rpid) => rpid.encodedId)
    .map((rpid) => ({
      label: rpidLabel(rpid),
      value: rpid.encodedId as string,
      rpid,
    }));

  const selectedRpidOption =
    rpidOptions.find((option) => option.value === value) ?? null;

  const onChange = (newValue: any) => {
    onChangeProp?.(newValue?.value);
  };

  return (
    <Select
      isMulti={false}
      isClearable
      options={rpidOptions}
      value={selectedRpidOption}
      onChange={onChange}
      aria-label={"Research Project ID"}
      formatOptionLabel={(option: any, { context }) => (
        <RpidOptionLabel rpid={(option as RpidOption).rpid} context={context} />
      )}
      {...props}
    />
  );
};

export default RpidInput;
