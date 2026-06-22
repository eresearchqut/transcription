import { FunctionComponent } from "react";
import { Props as SelectProps, Select } from "chakra-react-select";
import { SUPPORTED_TRANSCRIPTION_LANGUAGES as SUPPORTED_LANGUAGES_SOURCE } from "model";
import { isArray } from "lodash";

export interface LanguageInputProps
  extends Omit<SelectProps, "options" | "onChange"> {
  maxSize?: number;
  onChange?: (newValue: string | string[]) => void;
}

export const LanguageInput: FunctionComponent<LanguageInputProps> = ({
  onChange: onChangeProp,
  isDisabled,
  value,
  maxSize,
  ...props
}) => {
  const supportedLanguages = SUPPORTED_LANGUAGES_SOURCE as Record<
    string,
    string
  >;

  const languageOptions = Object.keys(supportedLanguages).map(
    (languageCode) => ({
      label: supportedLanguages[languageCode],
      value: languageCode,
    }),
  );

  const selectedLanguageOptions = languageOptions.filter((option) =>
    isArray(value)
      ? value.find((singleValue) => singleValue === option.value)
      : option.value === value,
  );

  const onChange = (newValue: any) => {
    const normalizedValue = isArray(newValue)
      ? newValue.map((selectedOption) => selectedOption.value)
      : newValue.value;

    onChangeProp?.(normalizedValue);
  };

  const maxLimitReached = maxSize
    ? selectedLanguageOptions.length >= maxSize
    : false;

  return (
    <Select
      options={languageOptions}
      value={selectedLanguageOptions}
      onChange={onChange}
      isDisabled={isDisabled}
      isOptionDisabled={() => maxLimitReached}
      {...props}
    />
  );
};

export default LanguageInput;
