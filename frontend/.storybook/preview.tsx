import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/nextjs";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "../context/auth-context";

const withChakra = (Story: any, context: any) => (
  <Provider forcedTheme={context.globals.backgrounds.value}>
    <AuthProvider>
      <Story />
    </AuthProvider>
  </Provider>
);

export default definePreview({
  decorators: [withChakra],
  addons: [addonDocs(), addonA11y()],
});
