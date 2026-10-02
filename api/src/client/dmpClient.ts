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
 * Deployed environments read the client credentials from Parameter Store. Tests
 * and the local stack, whose DMP stub accepts any client, use the environment.
 */
const getCredentials = async (): Promise<DmpCredentials> => {
  const parameterName = process.env.DMP_CREDENTIALS_PARAMETER;
  if (!parameterName) {
    return {
      clientId: process.env.DMP_CLIENT_ID ?? "",
      clientSecret: process.env.DMP_CLIENT_SECRET ?? "",
    };
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
 * Resolves undefined unless the RPID belongs to an active plan the user is a
 * member of. Rejects when the DMP could not be asked.
 */
export const getRpid = (
  userId: string,
  rpid: string,
): Promise<RpidDto | undefined> =>
  request((api) =>
    api.getRpidForUser({ userId, rpid, status: PlanStatus.Active }),
  );
