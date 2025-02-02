import type { Preview } from "@storybook/react";
import { ChakraProvider } from "@chakra-ui/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import { system } from "../theme";
import { ColorModeProvider } from "../components/ui/color-mode";
import { AuthProvider } from "../context/auth-context";

const globalTypes = {
  colorMode: {
    name: "Chakra UI Color Mode",
    defaultValue: "dark",
    toolbar: {
      items: [
        { title: "Light", value: "light" },
        { title: "Dark", value: "dark" },
      ],
      dynamicTitle: true,
    },
  },
};

const withChakra = (Story, context) => {
  return (
    <AuthProvider>
      <ChakraProvider value={system}>
        <ColorModeProvider forcedTheme={context.globals.colorMode}>
          <Story />
        </ColorModeProvider>
      </ChakraProvider>
    </AuthProvider>
  );
};

const preview: Preview = {
  globalTypes,
  decorators: [
    withThemeByClassName({
      defaultTheme: "light",
      themes: { light: "", dark: "dark" },
    }),
    withChakra,
  ],
};

export default preview;
