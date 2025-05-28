import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import SplunkOtelWeb from "@splunk/otel-web";
import SplunkSessionRecorder from "@splunk/otel-web-session-recorder";
import { LoadingPage } from "@/components/loadingPage";

export interface Config {
  splunkRum: {
    accessToken: string;
    applicationName: string;
    realm: string;
  };
  environment: string;
}

export interface AppInitContextState {
  config?: Config;
}

export const AppInitContext = createContext<AppInitContextState>(
  {} as AppInitContextState,
);

export const AppInitProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [isInitialised, setIsInitialised] = useState(false);
  const [config] = useState<Config>({
    splunkRum: {
      accessToken: process.env.NEXT_PUBLIC_SPLUNK_RUM_ACCESS_TOKEN ?? "",
      applicationName: process.env.NEXT_PUBLIC_SPLUNK_APPLICATION_NAME ?? "",
      realm: process.env.NEXT_PUBLIC_SPLUNK_REALM ?? "",
    },
    environment: process.env.NEXT_PUBLIC_ENV ?? "",
  });

  useEffect(() => {
    setIsInitialised(false);
    const rumAccessToken = config.splunkRum.accessToken;
    const realm = config.splunkRum.realm;
    if (rumAccessToken && realm) {
      const splunkConfig = {
        realm,
        rumAccessToken,
      };
      SplunkOtelWeb.init({
        ...splunkConfig,
        applicationName: config.splunkRum.applicationName,
        deploymentEnvironment: config.environment,
      });
      SplunkSessionRecorder.init(splunkConfig);
    }
    setIsInitialised(true);
  }, [config]);

  if (!isInitialised) {
    return <LoadingPage label={"Loading Config..."} />;
  }

  return (
    <AppInitContext.Provider value={{ config }}>
      {children}
    </AppInitContext.Provider>
  );
};
