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
    Page,
  },
};

export const theme = extendTheme({ config, colors }, overrides);
export default theme;
