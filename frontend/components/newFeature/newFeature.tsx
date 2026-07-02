import { HStack, Text } from "@chakra-ui/react";
import type { FunctionComponent, PropsWithChildren } from "react";
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
      borderColor={"purple.300"}
      borderWidth={2}
      p={2}
    >
      <Text
        color={{ base: "purple.700", _dark: "purple.300" }}
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
