import { createContext, FunctionComponent, PropsWithChildren, useContext, useEffect } from "react";
import SplunkOtelWeb, { SplunkOtelWebConfig } from "@splunk/otel-web";
import SplunkSessionRecorder from "@splunk/otel-web-session-recorder";


export interface MonitoringContextState {
  monitoringEnabled: boolean;
  setAttributes: (attributes: Record<string, any>) => void;
}

export const MonitoringContext = createContext<MonitoringContextState>(
  {
    monitoringEnabled: false,
    setAttributes: () => undefined
  }
);

const config: SplunkOtelWebConfig = {
  rumAccessToken: process.env.NEXT_PUBLIC_SPLUNK_RUM_ACCESS_TOKEN,
  realm: process.env.NEXT_PUBLIC_SPLUNK_REALM,
  applicationName: process.env.NEXT_PUBLIC_SPLUNK_APPLICATION_NAME ?? "",
  deploymentEnvironment: process.env.NEXT_PUBLIC_ENV ?? ""
};

export const useMonitoring = (): MonitoringContextState => {
  return useContext<MonitoringContextState>(MonitoringContext);
};

export const MonitoringProvider: FunctionComponent<PropsWithChildren> = ({
                                                                           children
                                                                         }) => {

  useEffect(() => {
    if (config.rumAccessToken) {
      SplunkOtelWeb.init({
        ...config
      });
      SplunkSessionRecorder.init({
        ...config
      });
    }
  }, []);

  const monitoringEnabled =  !!config.rumAccessToken;
  const setAttributes = (attributes: Record<string, any>) => monitoringEnabled ? SplunkOtelWeb.setGlobalAttributes(attributes) : undefined
  const state = {
    monitoringEnabled,
    setAttributes
  };
  return (
    <MonitoringContext.Provider value={state}>
      {children}
    </MonitoringContext.Provider>
  );
};
