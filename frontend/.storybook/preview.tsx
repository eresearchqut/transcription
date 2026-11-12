import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "../context/auth-context";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const withChakra = (Story: any, context: any) => (
  <Provider forcedTheme={context.globals.backgrounds.value}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Story />
      </AuthProvider>
    </QueryClientProvider>
  </Provider>
);

export default definePreview({
  decorators: [withChakra],
  addons: [addonDocs(), addonA11y()],
});
