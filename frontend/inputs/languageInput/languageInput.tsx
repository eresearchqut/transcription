import { FunctionComponent } from "react";
import { Props as SelectProps, Select } from "chakra-react-select";
import SUPPORTED_LANGUAGES_SOURCE from "@/public/supported_languages.json";
import { isArray } from "lodash";
import { Text } from "@chakra-ui/react";

export interface LanguageInputProps
  extends Omit<SelectProps, "options" | "onChange"> {
  onChange?: (newValue: string | string[]) => void;
}

export const LanguageInput: FunctionComponent<LanguageInputProps> = ({
  onChange: onChangeProp,
  isDisabled,
  value,
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

  if (isDisabled) {
    return (
      <Text as={"em"} color={"gray.600"}>
        Unavailable when PII redaction is enabled
      </Text>
    );
  }

  return (
    <Select
      options={languageOptions}
      value={selectedLanguageOptions}
      onChange={onChange}
      {...props}
    />
  );
};

export default LanguageInput;
