import {
  GetObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * S3 access for the browser, through the AWS SDK rather than Amplify Storage,
 * which offers no way to address an S3 endpoint other than the real AWS one.
 *
 * Credentials still come from Amplify, so Cognito and the identity pool remain
 * the only source of authorisation and the IAM policy on the authenticated role
 * continues to scope access to the caller's own prefix.
 */

const BUCKET = process.env.NEXT_PUBLIC_TRANSCRIPTION_BUCKET!;
const REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2";

/**
 * Only a local deploy sets an endpoint. The SDK addresses S3 virtual-host style
 * by default, so it would resolve `<bucket>.localhost`, for which there is no
 * wildcard DNS entry, so local deploys force path-style addressing. Mirrors
 * api/src/client/s3Client.ts.
 */
const localEndpoint = process.env.NEXT_PUBLIC_AWS_ENDPOINT;

/**
 * A provider rather than a static credentials object, since an upload can
 * outlive the credentials it started with. Amplify refreshes them when they
 * expire, and the SDK calls this again when it needs to re-sign.
 */
const credentials = async () => {
  const { credentials: sessionCredentials } = await fetchAuthSession();
  if (!sessionCredentials) {
    throw new Error("No credentials available for S3 access");
  }
  return sessionCredentials;
};

const clientConfig: S3ClientConfig = {
  region: REGION,
  credentials,
  ...(localEndpoint ? { endpoint: localEndpoint, forcePathStyle: true } : {}),
};

/**
 * A new client per call rather than a module-level singleton. The SDK memoises
 * whatever the credentials provider returns until it nears expiry, so a cached
 * client keeps signing as the user it was built for over the hour an Amplify
 * session lasts, and the authenticated role scopes S3 by identity. Amplify
 * Storage avoided this by resolving credentials inside each operation, and
 * client/fetchers.ts does the same for the API. Construction is config and a
 * middleware stack, with no connection pool to lose, and `Upload` holds its
 * client for the life of the transfer.
 */
const storageClient = () => new S3Client(clientConfig);

export interface UploadObjectProps {
  path: string;
  data: File;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  onProgress?: (progress: {
    transferredBytes: number;
    totalBytes?: number;
  }) => void;
}

/**
 * Uploads through lib-storage so that media files, which routinely exceed the
 * 5MB single-request limit, are split into a multipart upload automatically.
 */
export const uploadObject = async ({
  path,
  data,
  contentDisposition,
  metadata,
  onProgress,
}: UploadObjectProps): Promise<void> => {
  const upload = new Upload({
    client: storageClient(),
    params: {
      Bucket: BUCKET,
      Key: path,
      Body: data,
      ContentType: data.type || "application/octet-stream",
      ...(contentDisposition ? { ContentDisposition: contentDisposition } : {}),
      ...(metadata ? { Metadata: metadata } : {}),
    },
  });

  if (onProgress) {
    upload.on("httpUploadProgress", ({ loaded, total }) => {
      onProgress({ transferredBytes: loaded ?? 0, totalBytes: total });
    });
  }

  await upload.done();
};

export const downloadText = async (path: string): Promise<string> => {
  const response = await storageClient().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: path }),
  );
  return response.Body!.transformToString();
};

export interface SignedUrlProps {
  contentDisposition?: string;
  expiresIn?: number;
}

export const getSignedObjectUrl = async (
  path: string,
  { contentDisposition, expiresIn = 900 }: SignedUrlProps = {},
): Promise<string> =>
  getSignedUrl(
    storageClient(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: path,
      ...(contentDisposition
        ? { ResponseContentDisposition: contentDisposition }
        : {}),
    }),
    { expiresIn },
  );
