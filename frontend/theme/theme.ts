import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { Page } from "./components";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const colors = {
  brand: {
    900: "#012A4C",
    700: "#124C7B",
    500: "#0066B9",
    100: "#EFF6FB",
  },
};

const overrides: Record<string, any> = {
  components: {
    Button: {
      baseStyle: {
        borderRadius: 2,
      },
    },
    Card: {
      baseStyle: {
        header: {
          pb: 0,
        },
        container: {
          borderRadius: 2,
        },
        footer: {
          pt: 0,
        },
      },
    },
    Heading: {
      baseStyle: {
        color: "brand.500",
        _dark: {
          color: "white",
        },
      },
    },
    Page,
  },
};

export const theme = extendTheme({ config, colors }, overrides);
export default theme;
