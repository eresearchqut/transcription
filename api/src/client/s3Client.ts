import { S3Client } from "@aws-sdk/client-s3";

/**
 * Shared S3 client.
 *
 * The SDK addresses S3 virtual-host style by default, so a handler resolves
 * `<bucket>.<endpoint-host>`. A local emulator has no wildcard DNS entry for
 * that, so local deploys force path-style addressing instead. Real deployments
 * keep virtual-host addressing.
 *
 * X-Ray instrumentation is left to the importing handler.
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
  ...(process.env.S3_FORCE_PATH_STYLE === "true" && { forcePathStyle: true }),
});

export default s3Client;
