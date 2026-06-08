import { FunctionComponent } from "react";
import { Props as SelectProps, Select } from "chakra-react-select";
import SUPPORTED_TRANSLATION_LANGUAGES_SOURCE from "@/public/supported_translation_languages.json";

export interface TranslationLanguageInputProps
  extends Omit<SelectProps, "options" | "onChange" | "value"> {
  value?: string;
  onChange?: (newValue: string | undefined) => void;
}

export const TranslationLanguageInput: FunctionComponent<
  TranslationLanguageInputProps
> = ({ onChange: onChangeProp, value, ...props }) => {
  const supportedLanguages = SUPPORTED_TRANSLATION_LANGUAGES_SOURCE as Record<
    string,
    string
  >;

  const languageOptions = Object.keys(supportedLanguages).map(
    (languageCode) => ({
      label: supportedLanguages[languageCode],
      value: languageCode,
    }),
  );

  const selectedLanguageOption =
    languageOptions.find((option) => option.value === value) ?? null;

  const onChange = (newValue: any) => {
    onChangeProp?.(newValue?.value);
  };

  return (
    <Select
      isMulti={false}
      isClearable
      options={languageOptions}
      value={selectedLanguageOption}
      onChange={onChange}
      {...props}
    />
  );
};

export default TranslationLanguageInput;
