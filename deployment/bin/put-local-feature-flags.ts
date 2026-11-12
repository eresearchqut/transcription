#!/usr/bin/env node
/**
 * Turns every feature flag on in the emulator's Parameter Store, so a local
 * deploy exercises every feature. Flags already there are left alone, so a
 * change made with `aws ssm put-parameter --overwrite` lasts until the emulator
 * is restarted. The Compose bootstrap container runs this before every deploy.
 */
import {
  ParameterAlreadyExists,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import {
  featureFlagsParameterName,
  LOCAL_FEATURE_FLAGS,
} from "../lib/feature-flags";

// Without an endpoint the SDK addresses real AWS, whose flags this must never
// change.
if (!process.env.AWS_ENDPOINT_URL) {
  throw new Error(
    "AWS_ENDPOINT_URL is not set. This only writes to the local emulator, which the Compose bootstrap container addresses.",
  );
}

const name = featureFlagsParameterName("local");

new SSMClient()
  .send(
    new PutParameterCommand({
      Name: name,
      Type: "String",
      Value: JSON.stringify(LOCAL_FEATURE_FLAGS),
    }),
  )
  .then(() => {
    console.log(`Turned on every feature flag in ${name}`);
  })
  .catch((error) => {
    if (error instanceof ParameterAlreadyExists) {
      console.log(`Kept the feature flags already in ${name}`);
      return;
    }
    throw error;
  });
