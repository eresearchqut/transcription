import { FunctionComponent } from "react";
import PII_ATTRIBUTES from "@/public/pii_attributes.json";
import { Select } from "chakra-react-select";
import { Props as SelectProps } from "react-select/dist/declarations/src";
import get from "lodash/get";

export interface PiiInputProps extends Omit<SelectProps, "options"> {}

export const PiiInput: FunctionComponent<PiiInputProps> = (props) => {
  const piiAttributes = PII_ATTRIBUTES as Record<string, any>;

  const piiOptions = Object.keys(piiAttributes)
    .filter((piiCode) => get(piiAttributes[piiCode], "displayed", true))
    .map((piiCode) => ({
      label: piiAttributes[piiCode].label,
      value: piiCode,
    }));

  return <Select options={piiOptions} {...props} />;
};

export default PiiInput;
