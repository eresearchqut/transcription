import { Stack, Text } from "@chakra-ui/react";
import { Select, type Props as SelectProps } from "chakra-react-select";
import type { Rpid } from "model";
import type { FunctionComponent } from "react";

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

const rpidLabel = ({ rpid, title }: Rpid): string =>
  title ? `${rpid}: ${title}` : rpid;

const rpidDetails = ({ lead, supervisor, school, faculty }: Rpid): string =>
  [
    lead && `Lead: ${lead}`,
    supervisor && `Supervisor: ${supervisor}`,
    [school, faculty].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" \u00b7 ");

const RpidOptionLabel: FunctionComponent<{
  rpid: Rpid;
  context: "menu" | "value";
}> = ({ rpid, context }) => {
  const details = context === "menu" && rpidDetails(rpid);
  return (
    <Stack gap={0.5}>
      <Text as={"span"}>{rpidLabel(rpid)}</Text>
      {details && (
        <Text as={"span"} fontSize={"xs"} color={"fg.muted"}>
          {details}
        </Text>
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
  const rpidOptions: RpidOption[] = (rpids ?? []).map((rpid) => ({
    label: rpidLabel(rpid),
    value: rpid.rpid,
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
