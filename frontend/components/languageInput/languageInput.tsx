import { FunctionComponent } from "react";
import { Props as SelectProps, Select } from "chakra-react-select";
import SUPPORTED_LANGUAGES_SOURCE from "public/supported_languages.json";
import { isArray } from "lodash";

export interface LanguageInputProps extends Omit<SelectProps, "options"> {
  onChange: (newValue: any) => void;
}

export const LanguageInput: FunctionComponent<LanguageInputProps> = ({
  onChange: onChangeProp,
  defaultValue: defaultRawValue,
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

  const defaultValue = languageOptions.filter((option) =>
    isArray(defaultRawValue)
      ? defaultRawValue.find((singleValue) => singleValue === option.value)
      : option === defaultRawValue,
  );

  const onChange = (newValue: any) => {
    const normalizedValue = isArray(newValue)
      ? newValue.map((selectedOption) => selectedOption.value)
      : newValue.value;

    onChangeProp?.(normalizedValue);
  };

  return (
    <Select
      options={languageOptions}
      defaultValue={defaultValue}
      onChange={onChange}
      {...props}
    />
  );
};

export default LanguageInput;
