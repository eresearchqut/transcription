import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import xray from "aws-xray-sdk";
import type { Rpid } from "model";

const dmpApiUrl = () => process.env.DMP_API_URL ?? "";
const dmpTokenUrl = () => process.env.DMP_TOKEN_URL ?? "";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(ssmClient);
}

const EXPIRY_BUFFER_SECONDS = 60;
const FETCH_TIMEOUT_MS = 10_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface DmpCredentials {
  clientId: string;
  clientSecret: string;
}

let cachedToken: CachedToken | undefined;
let cachedCredentials: DmpCredentials | undefined;

export const clearTokenCache = () => {
  cachedToken = undefined;
  cachedCredentials = undefined;
};

const getCredentials = async (): Promise<DmpCredentials> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }
  const parameterName = process.env.DMP_CREDENTIALS_PARAMETER;
  if (parameterName) {
    const { Parameter } = await ssmClient.send(
      new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
    );
    if (!Parameter?.Value) {
      throw new Error(`DMP credentials ${parameterName} are empty`);
    }
    const { clientId, clientSecret } = JSON.parse(
      Parameter.Value,
    ) as Partial<DmpCredentials>;
    if (!clientId || !clientSecret) {
      throw new Error(
        `DMP credentials ${parameterName} must contain clientId and clientSecret`,
      );
    }
    cachedCredentials = { clientId, clientSecret };
  } else {
    cachedCredentials = {
      clientId: process.env.DMP_CLIENT_ID ?? "",
      clientSecret: process.env.DMP_CLIENT_SECRET ?? "",
    };
  }
  return cachedCredentials;
};

const fetchToken = async (): Promise<CachedToken> => {
  const { clientId, clientSecret } = await getCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch(dmpTokenUrl(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    cachedCredentials = undefined;
    throw new Error(
      `Failed to retrieve DMP access token: ${response.status} ${response.statusText}`,
    );
  }
  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in - EXPIRY_BUFFER_SECONDS) * 1000,
  };
};

const getToken = async (): Promise<string> => {
  if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
    cachedToken = await fetchToken();
  }
  return cachedToken.accessToken;
};

const getJson = async <T>(path: string): Promise<T> => {
  const baseUrl = dmpApiUrl().replace(/\/$/, "");
  const request = async () => {
    const token = await getToken();
    return fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  };
  let response = await request();
  if (response.status === 401 || response.status === 403) {
    clearTokenCache();
    response = await request();
  }
  if (!response.ok) {
    throw new Error(
      `DMP API request failed: GET ${path} ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
};

export const listRpids = (userId: string): Promise<Rpid[]> =>
  getJson<Rpid[]>(`/rpid/${encodeURIComponent(userId)}`);

export const getRpid = (userId: string, rpid: string): Promise<Rpid> =>
  getJson<Rpid>(
    `/rpid/${encodeURIComponent(userId)}/${encodeURIComponent(rpid)}`,
  );
