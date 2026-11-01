import type { ApiStackProps } from "./api-stack";

export interface DmpCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * The client the WireMock stand-in for the DMP issues tokens to. Keep it in
 * step with scripts/ministack/dmp/mappings/token.json.
 */
export const LOCAL_DMP_CLIENT: DmpCredentials = {
  clientId: "transcription-local",
  clientSecret: "transcription-local-secret",
};

export interface LocalDmp {
  /** Replace the DMP parameters in config/local.json. */
  parameters: Partial<
    Pick<ApiStackProps["parameters"], "DmpApiUrl" | "DmpTokenUrl" | "DmpWebUrl">
  >;
  /** What the local deploy stores in its DmpCredentialsParameter. */
  credentials: DmpCredentials;
}

const REAL_DMP_VARIABLES = [
  "DMP_API_URL",
  "DMP_TOKEN_URL",
  "DMP_CLIENT_ID",
  "DMP_CLIENT_SECRET",
] as const;

/**
 * The DMP a local deploy talks to. With none of REAL_DMP_VARIABLES set, that
 * is the WireMock stand-in config/local.json points at. Setting all of them
 * points the handlers at a real DMP instead, and DMP_WEB_URL, which is
 * optional either way, sets where the frontend's links to the DMP go.
 */
export const readLocalDmp = (env: NodeJS.ProcessEnv): LocalDmp => {
  const webUrl = env.DMP_WEB_URL ? { DmpWebUrl: env.DMP_WEB_URL } : {};
  const missing = REAL_DMP_VARIABLES.filter((name) => !env[name]);
  if (missing.length === REAL_DMP_VARIABLES.length) {
    return { parameters: webUrl, credentials: LOCAL_DMP_CLIENT };
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")}. A real DMP needs all of ${REAL_DMP_VARIABLES.join(", ")}. Unset them all to use the local stand-in.`,
    );
  }
  return {
    parameters: {
      DmpApiUrl: env.DMP_API_URL,
      DmpTokenUrl: env.DMP_TOKEN_URL,
      ...webUrl,
    },
    credentials: {
      clientId: env.DMP_CLIENT_ID!,
      clientSecret: env.DMP_CLIENT_SECRET!,
    },
  };
};
