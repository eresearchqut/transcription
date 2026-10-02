import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import xray from "aws-xray-sdk";
import type { Rpid } from "model";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(ssmClient);
}

const TOKEN_EXPIRY_BUFFER_SECONDS = 60;
const FETCH_TIMEOUT_MS = 10_000;

/** Transcriptions can only be assigned to plans that are still active. */
const PLAN_STATUS = "ACTIVE";

interface DmpCredentials {
  clientId: string;
  clientSecret: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface DmpResearcher {
  name?: string;
}

interface DmpOrganisation {
  name?: string;
}

/**
 * The parts of the DMP's v1 RpidDto that are used here. SDK 1.1 names the RPID
 * `encodedId` and nests the faculty and school in an `organisation` map. The
 * next release renames it to `rpid` and lifts both to the top level. Both
 * shapes are read so the service keeps working whichever one the DMP serves.
 */
interface DmpRpid {
  rpid?: string;
  encodedId?: string;
  title?: string;
  lead?: DmpResearcher;
  supervisor?: DmpResearcher;
  faculty?: DmpOrganisation;
  school?: DmpOrganisation;
  organisation?: Record<string, DmpOrganisation | undefined>;
}

let cachedCredentials: DmpCredentials | undefined;
let cachedToken: CachedToken | undefined;

export const clearTokenCache = () => {
  cachedCredentials = undefined;
  cachedToken = undefined;
};

/**
 * Deployed environments read the client credentials from Parameter Store. Tests
 * and the local stack, whose DMP stub accepts any client, use the environment.
 */
const getCredentials = async (): Promise<DmpCredentials> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }
  const parameterName = process.env.DMP_CREDENTIALS_PARAMETER;
  if (!parameterName) {
    cachedCredentials = {
      clientId: process.env.DMP_CLIENT_ID ?? "",
      clientSecret: process.env.DMP_CLIENT_SECRET ?? "",
    };
    return cachedCredentials;
  }
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
  return cachedCredentials;
};

const fetchToken = async (): Promise<CachedToken> => {
  const { clientId, clientSecret } = await getCredentials();
  const response = await fetch(process.env.DMP_TOKEN_URL ?? "", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    // The parameter may have been rotated since it was cached.
    cachedCredentials = undefined;
    throw new Error(
      `DMP token request failed: ${response.status} ${response.statusText}`,
    );
  }
  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  return {
    accessToken: access_token,
    expiresAt: Date.now() + (expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000,
  };
};

const getToken = async (): Promise<string> => {
  if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
    cachedToken = await fetchToken();
  }
  return cachedToken.accessToken;
};

/** Resolves undefined when the DMP answers 404. */
const getJson = async <T>(path: string): Promise<T | undefined> => {
  const baseUrl = (process.env.DMP_API_URL ?? "").replace(/\/$/, "");
  const url = `${baseUrl}${path}?${new URLSearchParams({ status: PLAN_STATUS })}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(
      `DMP request failed: GET ${path} ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as T;
};

const toRpid = (dto: DmpRpid): Rpid | undefined => {
  const rpid = dto.rpid ?? dto.encodedId;
  if (!rpid) {
    return undefined;
  }
  return {
    rpid,
    title: dto.title ?? "",
    lead: dto.lead?.name,
    supervisor: dto.supervisor?.name,
    faculty: (dto.faculty ?? dto.organisation?.faculty)?.name,
    school: (dto.school ?? dto.organisation?.school)?.name,
  };
};

const userPath = (userId: string) =>
  `/v1/rpid/user/${encodeURIComponent(userId)}`;

/** The active plans the user is a member of. */
export const listRpids = async (userId: string): Promise<Rpid[]> => {
  const dtos = (await getJson<DmpRpid[]>(userPath(userId))) ?? [];
  return dtos.map(toRpid).filter((rpid): rpid is Rpid => rpid !== undefined);
};

/**
 * Resolves undefined unless the RPID belongs to an active plan the user is a
 * member of. Rejects when the DMP could not be asked.
 */
export const getRpid = async (
  userId: string,
  rpid: string,
): Promise<Rpid | undefined> => {
  const dto = await getJson<DmpRpid>(
    `${userPath(userId)}/${encodeURIComponent(rpid)}`,
  );
  return dto && toRpid(dto);
};
