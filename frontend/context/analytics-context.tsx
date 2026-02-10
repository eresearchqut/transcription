import {
  Context,
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
} from "react";
import UmamiAnalytics, { UmamiAnalyticsProps } from "@danielgtmn/umami-react";

export interface AnalyticsContextOperations {
  track: (
    eventNameOrData?: string | Record<string, any>,
    eventData?: Record<string, any>,
  ) => void;
  identify: (
    uniqueIdOrData?: string | Record<string, any>,
    data?: Record<string, any>,
  ) => void;
}

const AnalyticsContext: Context<AnalyticsContextOperations> = createContext(
  {} as AnalyticsContextOperations,
);

export const useAnalytics = (): AnalyticsContextOperations => {
  return useContext<AnalyticsContextOperations>(AnalyticsContext);
};

const props: UmamiAnalyticsProps = {
  websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  url: process.env.NEXT_PUBLIC_UMAMI_URL,
  onlyInProduction: false,
  scriptAttributes:{
    'data-auto-track': 'true'
  }
};

const AnalyticsProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const track = useCallback(
    (
      eventNameOrData?: string | Record<string, any>,
      eventData?: Record<string, any>,
    ) => {
      if (typeof window !== "undefined" && (window as any).umami) {
        (window as any).umami.track(eventNameOrData, eventData);
      }
    },
    [],
  );
  const identify = useCallback(
    (
      uniqueIdOrData?: string | Record<string, any>,
      data?: Record<string, any>,
    ) => {
      if (typeof window !== "undefined" && (window as any).umami) {
        (window as any).umami.identify(uniqueIdOrData, data);
      }
    },
    [],
  );
  return (
    <AnalyticsContext.Provider value={{ track, identify }}>
      <UmamiAnalytics {...props} />
      {children}
    </AnalyticsContext.Provider>
  );
};

export { AnalyticsProvider, AnalyticsContext };
