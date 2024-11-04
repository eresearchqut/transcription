import { Box, Stack } from "@chakra-ui/layout";
import React, { FunctionComponent, PropsWithChildren, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  chakra,
  DarkMode,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Image,
  SkipNavLink,
  Spacer,
  StackDivider,
  useColorMode,
  useColorModeValue,
  useMultiStyleConfig,
} from "@chakra-ui/react";

import { withAnonymous, withAuthentication } from "../context/with-auth";
import { useAuth, useLogin, useLogout } from "../context/auth-context";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import { IoEnterOutline, IoExitOutline } from "react-icons/io5";
import loginImage from "@/public/login.jpg";
import { LuUpload } from "react-icons/lu";
import { RiPlayList2Fill } from "react-icons/ri";

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
    "Upload Media": { icon: <LuUpload />, url: "/transcription/upload" },
    "My Transcriptions": { icon: <RiPlayList2Fill />, url: "/transcription" },
  };
  const { handleLogin } = useLogin();
  const { handleLogout } = useLogout();

  const pageColor = useColorModeValue("gray.100", "gray.800");
  const cardColor = useColorModeValue("white", "gray.700");
  const cardBorderColor = useColorModeValue("gray.300", "gray.600");

  const templateAreas = `"header" "navigation" "main" "footer"`;
  const gridTemplateRows = "auto auto 1fr auto";
  const styles = useMultiStyleConfig("Page", props);

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

      <chakra.header __css={styles.header}>
        <DarkMode>
          <Stack
            direction="row"
            alignItems={"center"}
            maxWidth={"1576px"}
            m={"auto"}
            p={4}
          >
            <HStack
              divider={<StackDivider borderColor={"white"} />}
              spacing={3}
            >
              <Image
                alt="QUT logo"
                src={"/logo.png"}
                width={"40px"}
                height={"40px"}
              />
              <Heading size={"lg"}>Transcribe</Heading>
            </HStack>
            <Spacer />

            {!isAuthenticated && (
              <Button
                onClick={handleLogin}
                variant="outline"
                leftIcon={<IoEnterOutline />}
              >
                Log in
              </Button>
            )}
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                variant="outline"
                leftIcon={<IoExitOutline />}
              >
                Log out
              </Button>
            )}

            <IconButton
              variant="outline"
              onClick={toggleColorMode}
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              aria-label={`Toggle ${colorMode === "light" ? "Dark" : "Light"} Mode`}
            />
          </Stack>
        </DarkMode>
      </chakra.header>
      {isAuthenticated && (
        <Box width={"100%"} __css={styles.navigation}>
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
        <chakra.main __css={styles.mainContainer}>
          {isLanding ? (
            children
          ) : (
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
          )}
        </chakra.main>
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
