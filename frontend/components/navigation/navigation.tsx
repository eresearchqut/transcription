import { FunctionComponent, ReactElement } from "react";
import { Button, Stack } from "@chakra-ui/react";
import NextLink from "next/link";

interface NavigationItemProps {
  url: string;
  icon: ReactElement;
}

export interface NavigationProps {
  items: Record<string, NavigationItemProps>;
}

export const Navigation: FunctionComponent<NavigationProps> = ({
  items,
}: NavigationProps) => {
  return (
    <Stack
      spacing={4}
      direction={{ base: "column", sm: "row" }}
      align={"start"}
    >
      {Object.keys(items).map((title) => {
        const { icon, url } = items[title];
        return (
          <Button
            key={title}
            as={NextLink}
            leftIcon={icon}
            href={url}
            variant={"link"}
            color={"white"}
          >
            {title}
          </Button>
        );
      })}
    </Stack>
  );
};

export default Navigation;
