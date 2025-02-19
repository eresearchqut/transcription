import { FunctionComponent, PropsWithChildren } from "react";
import { HStack, Text } from "@chakra-ui/react";
import { MappedIcon } from "@/components/mappedIcon";

export interface NewFeatureProps {
  show?: boolean;
}

export const NewFeature: FunctionComponent<
  PropsWithChildren<NewFeatureProps>
> = ({ show, children }) => {
  return show ? (
    <HStack
      pos={"relative"}
      w={"full"}
      borderColor={"purple.200"}
      borderWidth={2}
      p={2}
    >
      <Text
        color={"purple.700"}
        position={"absolute"}
        top={-3}
        bg={"bg"}
        px={1}
        textStyle={"sm"}
      >
        <MappedIcon icon={"sparkle"} /> New
      </Text>
      {children}
    </HStack>
  ) : (
    children
  );
};

export default NewFeature;
