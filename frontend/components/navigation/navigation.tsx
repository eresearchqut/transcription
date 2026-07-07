import { Link, type LinkProps, List } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
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
  const { pathname } = useRouter();

  return (
    <List.Root
      variant={"plain"}
      flexDirection={{ base: "column", sm: "row" }}
      alignItems={"stretch"}
      gap={0}
    >
      {Object.keys(items).map((title) => {
        const { icon, url } = items[title];
        const isActive = pathname === url;
        return (
          <List.Item key={title} display={"flex"} alignItems={"stretch"}>
            <Link
              {...linkProps}
              display={"inline-flex"}
              alignItems={"center"}
              gap={1}
              px={4}
              py={2.5}
              rounded={"none"}
              bg={isActive ? "whiteAlpha.300" : undefined}
              fontWeight={isActive ? "semibold" : undefined}
              textDecoration={"none"}
              transition={"background 0.15s ease-in-out"}
              _hover={{
                bg: isActive ? "whiteAlpha.300" : "whiteAlpha.200",
                textDecoration: "none",
              }}
              aria-current={isActive ? "page" : undefined}
              asChild
            >
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
