import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  ClientCredentialsError,
  Configuration,
  clientCredentials,
  PlanStatus,
  ResponseError,
  RpidApi,
  type RpidDto,
} from "@eresearchqut/dmp-api";

import xray from "aws-xray-sdk";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(ssmClient);
}

const FETCH_TIMEOUT_MS = 10_000;

interface DmpCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Every environment, the local stack included, keeps the client credentials in
 * Parameter Store.
 */
const getCredentials = async (): Promise<DmpCredentials> => {
  const parameterName = process.env.DMP_CREDENTIALS_PARAMETER;
  if (!parameterName) {
    throw new Error("DMP_CREDENTIALS_PARAMETER is not set");
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
  return { clientId, clientSecret };
};

const fetchWithTimeout: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const createRpidApi = async (): Promise<RpidApi> => {
  const { clientId, clientSecret } = await getCredentials();
  return new RpidApi(
    new Configuration({
      basePath: (process.env.DMP_API_URL ?? "").replace(/\/$/, ""),
      accessToken: clientCredentials({
        tokenUrl: process.env.DMP_TOKEN_URL ?? "",
        clientId,
        clientSecret,
        fetchApi: fetchWithTimeout,
      }),
      fetchApi: fetchWithTimeout,
    }),
  );
};

let rpidApi: Promise<RpidApi> | undefined;

/** Forgets the credentials and the cached token. */
export const resetDmpClient = () => {
  rpidApi = undefined;
};

/** Resolves undefined when the DMP answers 404. */
const request = async <T>(
  call: (api: RpidApi) => Promise<T>,
): Promise<T | undefined> => {
  rpidApi ??= createRpidApi().catch((error) => {
    resetDmpClient();
    throw error;
  });
  const api = await rpidApi;
  try {
    return await call(api);
  } catch (error) {
    if (error instanceof ResponseError && error.response.status === 404) {
      return undefined;
    }
    if (error instanceof ClientCredentialsError) {
      // The parameter may have been rotated since it was read.
      resetDmpClient();
    }
    throw error;
  }
};

/** The active plans the user is a member of. */
export const listRpids = async (userId: string): Promise<RpidDto[]> =>
  (await request((api) =>
    api.listRpidsForUser({ userId, status: PlanStatus.Active }),
  )) ?? [];

/**
 * RPIDs are Sqids codes. Anything else could change the request's path: "."
 * resolves to the list route, which answers 200 for any user the DMP knows.
 */
const RPID_PATTERN = /^[A-Za-z0-9]+$/;

/**
 * The messages DMP v1 publishes for a 403 from getRpidForUser when the user is
 * not on the plan, or collaborates on it without access to transcription. Any
 * other 403, such as the one for a client that lacks the scope, is an error.
 */
const NO_ACCESS_MESSAGES = new Set([
  "The user does not have access to this RPID.",
  "The collaborator does not have access to perform this operation on this RPID.",
]);

const isNoAccess = async (error: unknown) => {
  if (!(error instanceof ResponseError) || error.response.status !== 403) {
    return false;
  }
  const body = (await error.response
    .clone()
    .json()
    .catch(() => undefined)) as { message?: unknown } | undefined;
  return (
    typeof body?.message === "string" && NO_ACCESS_MESSAGES.has(body.message)
  );
};

/**
 * Resolves undefined unless the RPID belongs to an active plan the user is a
 * member of, with access to transcription. Rejects when the DMP could not be
 * asked.
 */
export const getRpid = async (
  userId: string,
  rpid: string,
): Promise<RpidDto | undefined> => {
  if (!RPID_PATTERN.test(rpid)) {
    return undefined;
  }
  let project: RpidDto | undefined;
  try {
    project = await request((api) =>
      api.getRpidForUser({ userId, rpid, status: PlanStatus.Active }),
    );
  } catch (error) {
    if (await isNoAccess(error)) {
      return undefined;
    }
    throw error;
  }
  // The SDK doesn't check the shape of a response.
  if (project && (Array.isArray(project) || project.rpid !== rpid)) {
    console.warn(`The DMP answered for RPID ${rpid} with another project`);
    return undefined;
  }
  return project;
};
