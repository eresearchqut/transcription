import { FunctionComponent, PropsWithChildren, Suspense, useEffect } from "react";
import type { Preview } from "@storybook/react";
import { ChakraProvider, useColorMode } from "@chakra-ui/react";
import { theme } from "../theme";


interface ColorModeProps {
  colorMode: 'light' | 'dark';
}

const ColorMode: FunctionComponent<PropsWithChildren<ColorModeProps>> = ({colorMode, children}) => {
  const {setColorMode} = useColorMode();
  useEffect(() => {
    setColorMode(colorMode);
  }, [colorMode]);
  return children;
}

export const globalTypes = {
  colorMode: {
    name: 'Chakra UI Color Mode',
    defaultValue: 'dark',
    toolbar: {
      items: [
        {title: 'Light', value: 'light'},
        {title: 'Dark', value: 'dark'}
      ],
      dynamicTitle: true
    }
  }
};

const withChakra = (Story, context) => {
  return (
    <ChakraProvider theme={theme}>
      <ColorMode colorMode={context.globals.colorMode}>
        <Story/>
      </ColorMode>
    </ChakraProvider>
  );
};

const preview: Preview = {
  globalTypes,
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withChakra,
  ]
};

export default preview;
