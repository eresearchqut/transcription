import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sb } from "storybook/test";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "../context/auth-context";

// Spies keep the real hooks, so stories can override what they return with
// mocked(...).mockReturnValue in beforeEach. Storybook restores them between
// stories.
sb.mock(import("../hooks/useFeatures.tsx"), { spy: true });
sb.mock(import("../hooks/useRpids.tsx"), { spy: true });

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
