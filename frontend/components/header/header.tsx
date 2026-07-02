import {
  Box,
  Heading,
  HStack,
  IconButton,
  Image,
  Spacer,
  Stack,
  StackSeparator,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import type { FunctionComponent, ReactElement } from "react";
import { MappedIcon } from "@/components/mappedIcon";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  ColorModeButton,
  ColorModeIcon,
  useColorMode,
} from "@/components/ui/color-mode";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import logo from "@/public/logo.png";

export interface NavigationItem {
  icon: ReactElement;
  url: string;
}

export interface HeaderProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  navigationItems?: Record<string, NavigationItem>;
}

export const Header: FunctionComponent<HeaderProps> = ({
  isAuthenticated,
  onLogin,
  onLogout,
  navigationItems,
}) => {
  const buttonProps: ButtonProps = {
    colorPalette: "blue",
    variant: "outline",
  };

  const { toggleColorMode } = useColorMode();

  const authAction = isAuthenticated
    ? {
        label: "Log out",
        icon: "exit-outline",
        onClick: onLogout,
        event: "logout",
        variant: "outline" as const,
      }
    : {
        label: "Log in",
        icon: "enter-outline",
        onClick: onLogin,
        event: "login",
        variant: "solid" as const,
      };

  const authButton = (
    <Button
      onClick={authAction.onClick}
      colorPalette={"blue"}
      variant={authAction.variant}
      size={{ base: "sm", md: "md" }}
      data-umami-event={authAction.event}
    >
      <MappedIcon icon={authAction.icon} />
      {authAction.label}
    </Button>
  );

  return (
    <Stack
      direction={"row"}
      alignItems={"center"}
      maxWidth={"1576px"}
      m={"auto"}
      px={{ base: 3, md: 4 }}
      py={4}
      className={"dark"}
    >
      <HStack
        separator={<StackSeparator borderColor={"white"} />}
        gap={3}
        minW={0}
      >
        <Image alt="QUT logo" src={logo.src} width={"40px"} height={"40px"} />
        <Heading size={{ base: "xl", md: "3xl" }} color={"white"} truncate>
          Transcribe
        </Heading>
      </HStack>
      <Spacer />

      <HStack hideBelow={"md"} gap={2}>
        {authButton}
        <ColorModeButton size={"md"} {...buttonProps} />
      </HStack>

      {isAuthenticated ? (
        <Box hideFrom={"md"}>
          <MenuRoot positioning={{ placement: "bottom-end" }}>
            <MenuTrigger asChild>
              <IconButton aria-label={"Open menu"} {...buttonProps}>
                <MappedIcon icon={"menu"} />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              {navigationItems &&
                Object.entries(navigationItems).map(
                  ([title, { icon, url }]) => (
                    <MenuItem key={title} value={title} asChild>
                      <NextLink href={url}>
                        {icon}
                        <Text ml={2}>{title}</Text>
                      </NextLink>
                    </MenuItem>
                  ),
                )}
              {navigationItems && <MenuSeparator />}
              <MenuItem value={"toggle-color-mode"} onClick={toggleColorMode}>
                <ColorModeIcon />
                <Text ml={2}>Toggle theme</Text>
              </MenuItem>
              <MenuItem
                value={"auth-action"}
                onClick={authAction.onClick}
                data-umami-event={authAction.event}
              >
                <MappedIcon icon={authAction.icon} />
                <Text ml={2}>{authAction.label}</Text>
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        </Box>
      ) : (
        <HStack hideFrom={"md"} gap={2}>
          {authButton}
          <ColorModeButton size={"md"} {...buttonProps} />
        </HStack>
      )}
    </Stack>
  );
};

export default Header;
