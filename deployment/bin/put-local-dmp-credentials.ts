#!/usr/bin/env node
/**
 * Writes the DMP client credentials to the emulator's Parameter Store, under
 * the DmpCredentialsParameter in config/local.json, so the handlers read them
 * the way they do in a deployed environment. The emulator starts empty, so the
 * Compose bootstrap container runs this before every deploy.
 *
 * The credentials are those of the local client the WireMock stand-in for the
 * DMP accepts, or DMP_CLIENT_ID and DMP_CLIENT_SECRET when the environment
 * points the deploy at a real DMP (see lib/local-dmp.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { readLocalDmp } from "../lib/local-dmp";

// Without an endpoint the SDK addresses real AWS, which must never be given a
// local deploy's credentials.
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
const name: string = parameters.DmpCredentialsParameter;
const { credentials } = readLocalDmp(process.env);

new SSMClient()
  .send(
    new PutParameterCommand({
      Name: name,
      Type: "SecureString",
      Value: JSON.stringify(credentials),
      Overwrite: true,
    }),
  )
  .then(() => {
    console.log(
      `Wrote the credentials of DMP client ${credentials.clientId} to ${name}`,
    );
  });
