import {
  Box,
  Card,
  chakra,
  Flex,
  Grid,
  GridItem,
  Heading,
  SkipNavLink,
  Stack,
} from "@chakra-ui/react";
import type { FunctionComponent, PropsWithChildren, ReactNode } from "react";
import { Header } from "@/components/header";
import { MappedIcon } from "@/components/mappedIcon";
import loginImage from "@/public/login.jpg";
import { Footer } from "../components/footer";
import { Navigation } from "../components/navigation";

export interface LayoutProps {
  pageTitle?: string;
  headerAction?: ReactNode;
  isLanding?: boolean;
  isAuthenticated?: boolean;
  contentMaxWidth?: string;
  onLogin?: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}

export const Layout: FunctionComponent<PropsWithChildren<LayoutProps>> = ({
  children,
  pageTitle,
  headerAction,
  isLanding,
  isAuthenticated,
  contentMaxWidth,
  onLogin,
  onLogout,
}: any) => {
  const navigationItems = {
    Home: {
      icon: <MappedIcon icon={"home"} />,
      url: "/login",
    },
    "Upload Media": {
      icon: <MappedIcon icon={"upload"} />,
      url: "/",
    },
    "My Transcriptions": {
      icon: <MappedIcon icon={"playlist"} />,
      url: "/transcriptions",
    },
  };

  const templateAreas = `"header" "navigation" "main" "footer"`;
  const gridTemplateRows = "auto auto 1fr auto";
  const containerProps = { maxWidth: "1576px", margin: "0 auto" };
  const mainContainerProps = {
    ...containerProps,
    maxWidth: contentMaxWidth ?? containerProps.maxWidth,
  };

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
      gridTemplateColumns={"minmax(0, 1fr)"}
      transition="width .4s ease-in-out"
      minH={"100vh"}
      width={"100%"}
      maxWidth={"100vw"}
      overflowX={"hidden"}
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
          <Header
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            onLogout={onLogout}
            navigationItems={navigationItems}
          />
        </chakra.header>
      </GridItem>
      {isAuthenticated && (
        <Box
          hideBelow={"md"}
          width={"100%"}
          bgColor={"gray.800"}
          color={"white"}
        >
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
          <Box {...mainContainerProps}>
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
                  {(pageTitle || headerAction) && (
                    <Flex
                      direction={{ base: "column", sm: "row" }}
                      justify={"space-between"}
                      align={{ base: "flex-start", sm: "center" }}
                      gap={3}
                    >
                      {pageTitle && (
                        <Heading as={"h1"} fontSize={"3xl"}>
                          {pageTitle}
                        </Heading>
                      )}
                      {headerAction}
                    </Flex>
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

export default Layout;
