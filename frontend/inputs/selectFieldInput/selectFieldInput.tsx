import { useFieldContext } from "@chakra-ui/react";
import {
  chakraComponents,
  type GroupBase,
  type InputProps,
} from "chakra-react-select";

/**
 * react-select sets the input's aria-describedby itself, so add the enclosing
 * Field's helper and error text to it for screen readers.
 */
export const SelectFieldInput = <
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
>(
  props: InputProps<Option, IsMulti, Group>,
) => {
  const field = useFieldContext();
  const describedBy =
    [props["aria-describedby"], field?.ariaDescribedby]
      .filter(Boolean)
      .join(" ") || undefined;
  return <chakraComponents.Input {...props} aria-describedby={describedBy} />;
};

export default SelectFieldInput;
