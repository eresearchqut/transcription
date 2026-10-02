import type { RpidDto } from "@eresearchqut/dmp-api";
import { Select, type Props as SelectProps } from "chakra-react-select";
import type { FunctionComponent } from "react";

export interface RpidInputProps
  extends Omit<SelectProps, "options" | "onChange" | "value"> {
  rpids?: RpidDto[];
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
  const rpidOptions: RpidOption[] = (rpids ?? []).map(
    ({ encodedId, title }) => ({
      label: title ? `${encodedId}: ${title}` : encodedId,
      value: encodedId,
    }),
  );

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
      {...props}
    />
  );
};

export default RpidInput;
