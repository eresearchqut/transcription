import { createMultiStyleConfigHelpers } from "@chakra-ui/styled-system";

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers([
    "wrapper",
    "footerContainer",
    "footer",
    "main",
    "mainContainer",
    "header",
    "headerContainer",
    "navigation",
    "navigationContainer",
  ]);

const defaultContainer = {
  p: 4,
  maxWidth: "1576px",
  // maxWidth: "1440px", // TODO what's the standard width?
  margin: "0 auto",
};

const baseStyle = definePartsStyle(() => {
  return {
    headerContainer: defaultContainer,
    navigationContainer: defaultContainer,
    mainContainer: {
      ...defaultContainer,
      p: 3,
      pt: 30,
    },
    footerContainer: defaultContainer,
    header: {
      bgColor: "blue.900",
      color: "white",
    },
    navigation: {
      bgColor: "#333333",
      color: "#012A4C",
    },
    footer: {
      bgColor: "#124C7B",
      color: "white",
    },
    main: {},
  };
});

export const pageTheme = defineMultiStyleConfig({
  baseStyle,
});
