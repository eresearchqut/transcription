import { Link, type LinkProps, List } from "@chakra-ui/react";
import NextLink from "next/link";
import type { FunctionComponent, ReactElement } from "react";

interface NavigationItemProps {
  url: string;
  icon: ReactElement;
}

export interface NavigationProps extends LinkProps {
  items: Record<string, NavigationItemProps>;
}

export const Navigation: FunctionComponent<NavigationProps> = ({
  items,
  ...linkProps
}: NavigationProps) => {
  return (
    <List.Root
      variant={"plain"}
      flexDirection={{ base: "column", sm: "row" }}
      gap={{ base: undefined, sm: 4 }}
    >
      {Object.keys(items).map((title) => {
        const { icon, url } = items[title];
        return (
          <List.Item key={title}>
            <Link {...linkProps} asChild>
              <NextLink href={url}>
                {icon}
                {title}
              </NextLink>
            </Link>
          </List.Item>
        );
      })}
    </List.Root>
  );
};

export default Navigation;
