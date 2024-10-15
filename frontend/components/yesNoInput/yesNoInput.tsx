import { MouseEvent, FunctionComponent, useState } from "react";
import { ButtonGroup } from "@chakra-ui/button";
import {
  chakra,
  Button,
  ButtonProps,
  RadioGroupProps,
  RadioProps,
  useRadio,
  useRadioGroup,
} from "@chakra-ui/react";
import { isUndefined } from "lodash";

export interface Option {
  value: string;
  label: string;
}

export interface RadioButtonProps
  extends Pick<RadioGroupProps, "id" | "isDisabled" | "value" | "onChange">,
    Pick<ButtonProps, "size" | "colorScheme"> {
  options: Option[];
  isClearable?: boolean;
}

interface RadioInputProps extends RadioProps {
  label: string;
  buttonProps?: ButtonProps;
}

export const RadioInput = ({
  label,
  buttonProps,
  ...radioProps
}: RadioInputProps) => {
  const { state, getInputProps, getRadioProps, htmlProps } = useRadio({
    ...radioProps,
  });

  return (
    <chakra.label {...htmlProps}>
      <input {...getInputProps()} tabIndex={-1} />
      <Button
        {...buttonProps}
        {...getRadioProps()}
        variant={state.isChecked ? "solid" : "outline"}
        aria-pressed={state.isChecked}
      >
        {label}
      </Button>
    </chakra.label>
  );
};

export const RadioButton: FunctionComponent<RadioButtonProps> = ({
  id,
  value: initialValue,
  isClearable,
  options,
  onChange,
  isDisabled,
  ...buttonProps
}) => {
  const { value, setValue, getRadioProps, getRootProps } = useRadioGroup({
    defaultValue: initialValue,
    name: id,
  });

  const onClick = (optionValue: string) => () => {
    if (isDisabled) {
      return;
    }
    if (value === optionValue && isClearable) {
      setValue("");
      onChange?.("");
    } else {
      setValue(optionValue);
      onChange?.(optionValue);
    }
  };

  return (
    <ButtonGroup
      spacing={0}
      isAttached={true}
      aria-labelledby={`${id}-label`}
      {...getRootProps()}
    >
      <RadioInput
        hidden={true}
        label={"Unanswered"}
        {...getRadioProps({ isDisabled, value: "" })}
      />
      {options.map((option, index) => {
        const { value: optionValue, label } = option;
        const radioProps = getRadioProps({
          value: optionValue,
          isChecked: value === optionValue,
          isDisabled,
        });
        return (
          <RadioInput
            key={label}
            label={label}
            buttonProps={{
              ...buttonProps,
              onClick: onClick(optionValue),
              ...(index === 0 && { borderRightRadius: "none" }),
              ...(index === options.length - 1 && {
                borderLeftRadius: "none",
                borderLeft: "none",
              }),
            }}
            {...radioProps}
          />
        );
      })}
    </ButtonGroup>
  );
};

export interface YesNoInputProps {
  isClearable?: boolean;
  value: boolean;
  onChange: (value: boolean | undefined) => void;
}

export const YesNoInput: FunctionComponent<YesNoInputProps> = ({
  value,
  onChange,
  isClearable,
  ...buttonProps
}) => {
  const [selectedValue, setSelectedValue] = useState<boolean | undefined>(
    value,
  );

  const options = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  const parseValue = (value: string | undefined): boolean | undefined =>
    value ? value === "yes" : undefined;

  const valueToString = (value: boolean | undefined): string | undefined =>
    isUndefined(value) ? undefined : value ? "yes" : "no";

  const onClick = (nextValue: string) => {
    const clickedValue = parseValue(nextValue);
    if (selectedValue === clickedValue) {
      if (isClearable) {
        setSelectedValue(undefined);
        onChange?.(undefined);
      }
    } else {
      setSelectedValue(clickedValue);
      onChange?.(clickedValue);
    }
  };

  return (
    <RadioButton
      {...buttonProps}
      options={options}
      value={valueToString(value)}
      onChange={onClick}
    />
  );
};

export default YesNoInput;
