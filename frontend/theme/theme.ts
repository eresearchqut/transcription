import { extendTheme, type ThemeConfig } from "@chakra-ui/react";
import { Page } from "./components";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const colors = {
  blue: {
    900: "#012A4C",
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
    Page,
  },
};

export const theme = extendTheme({ config, colors }, overrides);
export default theme;
