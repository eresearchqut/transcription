import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import addonLinks from "@storybook/addon-links";
import { definePreview } from "@storybook/nextjs";
import { AuthProvider } from "../context/auth-context";
import { Provider } from "@/components/ui/provider";

const withChakra = (Story: any, context: any) => (
  <Provider forcedTheme={context.globals.backgrounds.value}>
    <AuthProvider>
      <Story />
    </AuthProvider>
  </Provider>
);

export default definePreview({
  decorators: [withChakra],
  addons: [addonLinks(), addonDocs(), addonA11y()],
});
