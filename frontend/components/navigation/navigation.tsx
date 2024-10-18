import { FunctionComponent } from "react";
import { Button, Wrap, WrapItem } from "@chakra-ui/react";
import NextLink from "next/link";

export interface NavigationProps {
  items: Record<string, string>;
}

export const Navigation: FunctionComponent<NavigationProps> = ({
  items,
}: NavigationProps) => {
  return (
    <Wrap spacing={[2, 3]}>
      {Object.keys(items).map((title) => (
        <WrapItem key={title}>
          <Button
            as={NextLink}
            href={items[title]}
            variant={"link"}
            color={"white"}
          >
            {title}
          </Button>
        </WrapItem>
      ))}
    </Wrap>
  );
};

export default Navigation;
