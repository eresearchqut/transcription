#!/usr/bin/env node
/**
 * Writes the parameters a local deploy reads from the emulator's Parameter
 * Store, which starts empty. The Compose bootstrap container runs this when it
 * starts, and `pnpm ministack:deploy` before each deploy.
 *
 * - The DMP client credentials, under the DmpCredentialsParameter in
 *   config/local.json, so the handlers read them the way they do in a deployed
 *   environment. They are those of the local client the WireMock stand-in for
 *   the DMP accepts, or DMP_CLIENT_ID and DMP_CLIENT_SECRET when the
 *   environment points the deploy at a real DMP (see lib/local-dmp.ts).
 * - The feature flags. Any flag the parameter doesn't have yet is turned on,
 *   so a local deploy exercises every feature, including one added since the
 *   emulator started. A flag already there keeps its value, so a change made
 *   with `aws ssm put-parameter` lasts until the emulator is restarted.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import {
  featureFlagsParameterName,
  LOCAL_FEATURE_FLAGS,
} from "../lib/feature-flags";
import { readLocalDmp } from "../lib/local-dmp";

const readFlags = async (
  ssm: SSMClient,
  name: string,
): Promise<Record<string, unknown>> => {
  let value: string | undefined;
  try {
    const { Parameter } = await ssm.send(
      new GetParameterCommand({ Name: name }),
    );
    value = Parameter?.Value;
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      return {};
    }
    throw error;
  }
  try {
    const flags = JSON.parse(value ?? "{}");
    if (flags && typeof flags === "object" && !Array.isArray(flags)) {
      return flags;
    }
  } catch {
    // Replaced below, as is any other value that isn't a JSON object.
  }
  console.warn(`Replacing ${name}, which isn't a JSON object: ${value}`);
  return {};
};

const main = async () => {
  // Without an endpoint the SDK addresses real AWS, which must never be given
  // a local deploy's credentials or have its flags changed.
  if (!process.env.AWS_ENDPOINT_URL) {
    throw new Error(
      "AWS_ENDPOINT_URL is not set. This only writes to the local emulator, which the Compose bootstrap container addresses.",
    );
  }

  const { parameters } = JSON.parse(
    readFileSync(resolve(__dirname, "../config/local.json"), {
      encoding: "utf8",
    }),
  );
  const credentialsName: string = parameters.DmpCredentialsParameter;
  const { credentials } = readLocalDmp(process.env);
  const flagsName = featureFlagsParameterName("local");
  const ssm = new SSMClient();

  await ssm.send(
    new PutParameterCommand({
      Name: credentialsName,
      Type: "SecureString",
      Value: JSON.stringify(credentials),
      Overwrite: true,
    }),
  );
  console.log(
    `Wrote the credentials of DMP client ${credentials.clientId} to ${credentialsName}`,
  );

  const flags = await readFlags(ssm, flagsName);
  const added = Object.keys(LOCAL_FEATURE_FLAGS).filter(
    (name) => !(name in flags),
  );
  if (added.length === 0) {
    console.log(`Kept the feature flags already in ${flagsName}`);
    return;
  }
  await ssm.send(
    new PutParameterCommand({
      Name: flagsName,
      Type: "String",
      Value: JSON.stringify({ ...LOCAL_FEATURE_FLAGS, ...flags }),
      Overwrite: true,
    }),
  );
  console.log(`Turned on ${added.join(", ")} in ${flagsName}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
