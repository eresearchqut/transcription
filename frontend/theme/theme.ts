import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from "@chakra-ui/react";
import { merge } from "lodash";
import { cardSlotRecipe } from "./slotRecipes";

const colors = {
  brand: {
    900: { value: "#012A4C" },
    700: { value: "#124C7B" },
    500: { value: "#0066B9" },
    100: { value: "#EFF6FB" },
  },
};

const { button: chakraButtonRecipe, heading: chakraHeadingRecipe } =
  defaultConfig?.theme?.recipes ?? {};

const buttonRecipe = defineRecipe(
  merge(chakraButtonRecipe, { base: { borderRadius: 2 } }),
);

const headingRecipe = defineRecipe(
  merge(chakraHeadingRecipe, {
    base: { color: { base: "brand.500", _dark: "white" } },
  }),
);

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors,
    },
    recipes: {
      button: buttonRecipe,
      heading: headingRecipe,
    },
    slotRecipes: {
      card: cardSlotRecipe,
    },
  },
});

const system = createSystem(defaultConfig, customConfig);
export default system;
