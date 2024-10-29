import { Box, Stack } from "@chakra-ui/layout";
import React, { FunctionComponent, PropsWithChildren, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  chakra,
  DarkMode,
  Divider,
  Grid,
  GridItem,
  Heading,
  IconButton,
  Image,
  SkipNavLink,
  Spacer,
  useColorMode,
  useColorModeValue,
  useMultiStyleConfig,
} from "@chakra-ui/react";

import { withAnonymous, withAuthentication } from "../context/with-auth";
import { useAuth, useLogin, useLogout } from "../context/auth-context";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { useRouter } from "next/router";
import { IoEnterOutline, IoExitOutline } from "react-icons/io5";
import loginImage from "@/public/login.jpg";

export interface PageProps {
  pageTitle?: string;
  isLanding?: boolean;
}

export const Layout: FunctionComponent<PropsWithChildren<PageProps>> = ({
  children,
  pageTitle,
  isLanding,
  ...props
}: any) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigationItems = {
    "Upload Media": "/transcription/upload",
    "My Transcriptions": "/transcription",
  };
  const { handleLogin } = useLogin();
  const { handleLogout } = useLogout();

  const pageColor = useColorModeValue("gray.100", "gray.800");
  const cardColor = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.300", "gray.600");

  const templateAreas = `"header" "navigation" "main" "footer"`;
  const gridTemplateRows = "auto auto 1fr auto";
  const styles = useMultiStyleConfig("Page", props);

  const router = useRouter();

  const {
    state: { isAuthenticated, error },
    initializeUser,
  } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLanding) {
      initializeUser().then();
    }
  }, [isAuthenticated, isLanding, initializeUser]);

  const landingBackgroundProps = {
    backgroundImage: { base: undefined, sm: `url(${loginImage.src})` },
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  };

  return (
    <Grid
      templateAreas={templateAreas}
      gridTemplateRows={gridTemplateRows}
      transition="width .4s ease-in-out"
      minH={"100vh"}
      bgColor={pageColor}
      {...(isLanding && landingBackgroundProps)}
    >
      <SkipNavLink id="main">Skip to content</SkipNavLink>

      <Box bg={"blue.900"} color={"white"} width={"100%"}>
        <DarkMode>
          <Stack
            direction="row"
            alignItems={"center"}
            maxWidth={"1576px"}
            m={"auto"}
            p={4}
          >
            <Image
              alt="QUT logo"
              src={"/logo.png"}
              width={"40px"}
              height={"40px"}
            />
            <Divider orientation="vertical" />
            <Heading size={"lg"}>Transcribe</Heading>
            <Spacer />

            {!isAuthenticated && (
              <Button
                onClick={handleLogin}
                variant="outline"
                leftIcon={<IoEnterOutline />}
              >
                Login
              </Button>
            )}
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                variant="outline"
                leftIcon={<IoExitOutline />}
              >
                Logout
              </Button>
            )}

            <IconButton
              variant="outline"
              onClick={toggleColorMode}
              icon={colorMode === "light" ? <SunIcon /> : <MoonIcon />}
              aria-label={`Toggle ${colorMode === "light" ? "Dark" : "Light"} Mode`}
            />
          </Stack>
        </DarkMode>
      </Box>
      {isAuthenticated && (
        <Box bg={"gray.800"} color={"white"} width={"100%"}>
          <Stack
            direction="row"
            alignItems={"center"}
            maxWidth={"1576px"}
            m={"auto"}
            p={4}
          >
            <Navigation items={navigationItems} />
          </Stack>
        </Box>
      )}

      <Box __css={styles.main} id={"main"}>
        {isLanding ? (
          children
        ) : (
          <chakra.main __css={styles.mainContainer}>
            <Card
              rounded={1}
              mb={0}
              bgColor={cardColor}
              borderWidth={1}
              borderColor={cardBorderColor}
            >
              <CardHeader pl={6} pr={6} pb={0}>
                {pageTitle && (
                  <Heading as={"h1"} size={"lg"}>
                    {pageTitle}
                  </Heading>
                )}
              </CardHeader>
              <CardBody pl={6} pr={6}>
                {children}
              </CardBody>
            </Card>
          </chakra.main>
        )}
      </Box>

      <GridItem area={"footer"}>
        <Box __css={styles.footer}>
          <chakra.footer __css={styles.footerContainer}>
            <Footer />
          </chakra.footer>
        </Box>
      </GridItem>
    </Grid>
  );
};

const mapLayoutPropsToLayoutTree = (props: PropsWithChildren<PageProps>) => {
  const AuthenticatedLayout = withAuthentication(Layout);
  return <AuthenticatedLayout {...props} />;
};

export default mapLayoutPropsToLayoutTree;

export const LoginLayout = (props: PropsWithChildren<PageProps>) => {
  const AuthenticatedLayout = withAnonymous(Layout);
  return <AuthenticatedLayout {...props} />;
};
