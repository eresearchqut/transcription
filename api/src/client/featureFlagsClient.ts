import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from "@aws-sdk/client-ssm";

import xray from "aws-xray-sdk";
import { FEATURES_OFF, type FeatureFlags } from "model";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

if (process.env.NODE_ENV !== "test") {
  xray.captureAWSv3Client(ssmClient);
}

/** How long a Lambda container uses the flags before reading them again. */
const CACHE_MS = 60_000;

let cached: { flags: FeatureFlags; readAt: number } | undefined;

/** Forgets the flags read so far. */
export const resetFeatureFlags = () => {
  cached = undefined;
};

/**
 * A flag is only on when it is true, so a value such as "true" leaves its
 * feature off. That is logged rather than thrown, so one bad value doesn't
 * stop the other flags being read.
 */
export const parseFeatureFlags = (value: string): FeatureFlags => {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(FEATURES_OFF).map((name) => {
      if (parsed[name] !== undefined && typeof parsed[name] !== "boolean") {
        console.warn(
          `Feature flag ${name} is ${JSON.stringify(parsed[name])} rather than true or false, so it is off`,
        );
      }
      return [name, parsed[name] === true];
    }),
  ) as unknown as FeatureFlags;
};

const readFeatureFlags = async (): Promise<FeatureFlags> => {
  const name = process.env.FEATURE_FLAGS_PARAMETER;
  if (!name) {
    return FEATURES_OFF;
  }
  try {
    const { Parameter } = await ssmClient.send(
      new GetParameterCommand({ Name: name }),
    );
    return parseFeatureFlags(Parameter?.Value ?? "{}");
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      return FEATURES_OFF;
    }
    throw error;
  }
};

/**
 * The features that are on, read from Parameter Store at most once a minute in
 * each Lambda container. When a read fails the last flags read are used, so
 * this only rejects when there are none.
 */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  if (cached && Date.now() - cached.readAt < CACHE_MS) {
    return cached.flags;
  }
  try {
    const flags = await readFeatureFlags();
    cached = { flags, readAt: Date.now() };
    return flags;
  } catch (error) {
    if (cached) {
      console.error(
        "Failed to read the feature flags, so the last ones read are used",
        error,
      );
      return cached.flags;
    }
    throw error;
  }
};
