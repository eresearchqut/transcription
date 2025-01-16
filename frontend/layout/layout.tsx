import React, { FunctionComponent, PropsWithChildren, useEffect } from "react";
import {
  Box,
  Card,
  Grid,
  GridItem,
  Heading,
  SkipNavLink,
  Stack,
  chakra,
} from "@chakra-ui/react";

import { withAnonymous, withAuthentication } from "../context/with-auth";
import { useAuth } from "../context/auth-context";
import { Navigation } from "../components/navigation";
import { Footer } from "../components/footer";
import loginImage from "@/public/login.jpg";
import { MappedIcon } from "@/components/mappedIcon";
import { Header } from "@/components/header";

export interface PageProps {
  pageTitle?: string;
  isLanding?: boolean;
}

const Layout: FunctionComponent<PropsWithChildren<PageProps>> = ({
  children,
  pageTitle,
  isLanding,
}: any) => {
  const navigationItems = {
    "Upload Media": {
      icon: <MappedIcon icon={"upload"} />,
      url: "/transcription/upload",
    },
    "My Transcriptions": {
      icon: <MappedIcon icon={"playlist"} />,
      url: "/transcription",
    },
  };

  const templateAreas = `"header" "navigation" "main" "footer"`;
  const gridTemplateRows = "auto auto 1fr auto";

  const {
    state: { isAuthenticated },
    initializeUser,
  } = useAuth();

  const containerProps = { maxWidth: "1576px", margin: "0 auto" };

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
      alignContent={"stretch"}
      bgColor={{ base: "gray.100", _dark: "gray.900" }}
      {...(isLanding && landingBackgroundProps)}
    >
      <SkipNavLink id="main">Skip to content</SkipNavLink>

      <GridItem
        area={"header"}
        bgColor={"brand.900"}
        justifyContent={"stretch"}
      >
        <chakra.header>
          <Header />
        </chakra.header>
      </GridItem>
      {isAuthenticated && (
        <Box width={"100%"} bgColor={"gray.800"} color={"white"}>
          <Stack
            direction="row"
            alignItems={"center"}
            maxWidth={"1576px"}
            m={"auto"}
            p={4}
          >
            <chakra.nav>
              <Navigation items={navigationItems} color={"white"} />
            </chakra.nav>
          </Stack>
        </Box>
      )}
      <Box id={"main"} p={3} pt={30}>
        <chakra.main>
          <Box {...containerProps}>
            {isLanding ? (
              children
            ) : (
              <Card.Root
                rounded={1}
                mb={0}
                borderWidth={1}
                variant={"elevated"}
              >
                <Card.Header pl={6} pr={6} pb={0}>
                  {pageTitle && (
                    <Heading as={"h1"} fontSize={"3xl"}>
                      {pageTitle}
                    </Heading>
                  )}
                </Card.Header>
                <Card.Body pl={6} pr={6}>
                  {children}
                </Card.Body>
              </Card.Root>
            )}
          </Box>
        </chakra.main>
      </Box>

      <GridItem area={"footer"} bgColor={"brand.900"} color={"white"} p={4}>
        <Box {...containerProps}>
          <chakra.footer>
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
  const AnonymousLayout = withAnonymous(Layout);
  return <AnonymousLayout {...props} />;
};
