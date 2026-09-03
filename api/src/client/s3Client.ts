import type { S3ClientConfig } from "@aws-sdk/client-s3";

/**
 * Shared S3 client configuration.
 *
 * The SDK addresses S3 virtual-host style by default, so a handler resolves
 * `<bucket>.<endpoint-host>`. Against a local emulator there is no wildcard DNS
 * entry for that and every call fails with ENOTFOUND before leaving the
 * container, so local deploys force path-style addressing instead. Real
 * deployments are unaffected and keep virtual-host addressing.
 */
export const s3ClientConfig: S3ClientConfig = {
  region: process.env.AWS_REGION || "ap-southeast-2",
  ...(process.env.S3_FORCE_PATH_STYLE === "true" && { forcePathStyle: true }),
};
