import { definePreview } from "@storybook/nextjs";
import { AuthProvider } from "../context/auth-context";
import { DecoratorFunction } from "storybook/internal/types";
import { Provider } from "@/components/ui/provider";

type DecoratorType = DecoratorFunction<
  never,
  {
    [x: string]: any;
  }
>;

const withChakra = (Story: any, context: any) => (
  <Provider forcedTheme={context.globals.backgrounds.value}>
    <AuthProvider>
      <Story />
    </AuthProvider>
  </Provider>
);

export default definePreview({
  decorators: [withChakra as unknown as DecoratorType],
});
