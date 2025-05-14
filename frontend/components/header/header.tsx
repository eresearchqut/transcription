import React, { FunctionComponent } from "react";
import {
  Button,
  Heading,
  HStack,
  Image,
  Spacer,
  Stack,
  StackSeparator,
} from "@chakra-ui/react";
import { MappedIcon } from "@/components/mappedIcon";
import { ColorModeButton } from "@/components/ui/color-mode";
import { useAuth, useLogin } from "../../context/auth-context";

import logo from "@/public/logo.png";
import { ButtonProps } from "@/components/ui/button";
import { signOut } from "aws-amplify/auth";

export const Header: FunctionComponent = () => {
  const {
    state: { isAuthenticated },
  } = useAuth();
  const { handleLogin } = useLogin();
  const buttonProps: ButtonProps = {
    colorPalette: "blue",
    variant: "outline",
  };

  return (
    <Stack
      direction={{ base: "column", sm: "row" }}
      maxWidth={"1576px"}
      m={"auto"}
      p={4}
      className={"dark"}
    >
      <HStack separator={<StackSeparator borderColor={"white"} />} gap={3}>
        <Image alt="QUT logo" src={logo.src} width={"40px"} height={"40px"} />
        <Heading size={"3xl"} color={"white"}>
          Transcribe
        </Heading>
      </HStack>
      <Spacer />
      {!isAuthenticated && (
        <Button onClick={handleLogin} {...buttonProps}>
          <MappedIcon icon={"enter-outline"} /> Log in
        </Button>
      )}
      {isAuthenticated && (
        <Button
          onClick={() => {
            signOut().then();
          }}
          {...buttonProps}
        >
          <MappedIcon icon={"exit-outline"} />
          Log out
        </Button>
      )}
      <ColorModeButton size={"md"} {...buttonProps} />
    </Stack>
  );
};

export default Header;
