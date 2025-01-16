import { merge } from "lodash";
import { defaultConfig, defineSlotRecipe } from "@chakra-ui/react";

const chakraCardSlotRecipe = defaultConfig?.theme?.slotRecipes?.card;

const cardSlotRecipe = defineSlotRecipe(
  merge(chakraCardSlotRecipe, {
    base: {
      root: {
        borderRadius: 0,
      },
      title: {
        pb: 2,
      },
    },
  }),
);

export default cardSlotRecipe;
