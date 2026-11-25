import { Select, type Props as SelectProps } from "chakra-react-select";
import type { Rpid } from "model";
import type { FunctionComponent } from "react";
import { SelectFieldInput } from "../selectFieldInput";

export interface RpidInputProps
  extends Omit<SelectProps, "options" | "onChange" | "value"> {
  rpids?: Rpid[];
  value?: string;
  onChange?: (newValue: string | undefined) => void;
}

interface RpidOption {
  label: string;
  value: string;
}

export const RpidInput: FunctionComponent<RpidInputProps> = ({
  rpids,
  onChange: onChangeProp,
  value,
  ...props
}) => {
  const rpidOptions: RpidOption[] = (rpids ?? []).map(({ rpid, title }) => ({
    label: title ? `${rpid}: ${title}` : rpid,
    value: rpid,
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
      components={{ Input: SelectFieldInput }}
      aria-label={"Data Management Plan"}
      {...props}
    />
  );
};

export default RpidInput;
