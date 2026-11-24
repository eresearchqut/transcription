import { setTimeout as sleep } from "node:timers/promises";

import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  ClientCredentialsError,
  Configuration,
  clientCredentials,
  FetchError,
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
 * The waits before the second and third attempts to check an RPID. With
 * FETCH_TIMEOUT_MS, the attempts take at most about 45 seconds, inside the
 * upload handler's timeout. listRpids doesn't retry, so the API answers within
 * API Gateway's 29 second limit.
 */
const RETRY_DELAYS_MS = [1_000, 3_000];

/**
 * Whether asking again could succeed: after a timeout or network failure, a
 * 429 or 5xx answer, or a failed token request, after which `request` reads
 * the credentials again.
 */
const isTransient = (error: unknown) =>
  error instanceof FetchError ||
  error instanceof ClientCredentialsError ||
  (error instanceof ResponseError &&
    (error.response.status === 429 || error.response.status >= 500));

const withRetries = async <T>(call: () => Promise<T>): Promise<T> => {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await call();
    } catch (error) {
      if (!isTransient(error)) {
        throw error;
      }
      console.warn(`Retrying a failed DMP request in ${delay} ms`, error);
      await sleep(delay);
    }
  }
  return call();
};

/**
 * Resolves undefined unless the RPID belongs to an active plan the user is a
 * member of, with access to transcription. Rejects when the DMP could not be
 * asked, after retrying failures that might not last.
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
    project = await withRetries(() =>
      request((api) =>
        api.getRpidForUser({ userId, rpid, status: PlanStatus.Active }),
      ),
    );
  } catch (error) {
    // The DMP answers 403 when the user isn't on the plan or can't use it for
    // transcription, and tells these apart only by the message. A client that
    // lacks the scope gets a 403 too, which is why the body is logged.
    if (error instanceof ResponseError && error.response.status === 403) {
      console.warn(
        `The DMP refused RPID ${rpid} for ${userId}`,
        await error.response.text().catch(() => undefined),
      );
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
