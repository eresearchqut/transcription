import {
  GetObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * S3 access for the browser.
 *
 * Amplify Storage is deliberately not used here. It offers no way to address an
 * S3 endpoint other than the real AWS one, which a local deploy against the
 * emulator needs, and that omission is a longstanding design decision rather
 * than a gap: https://github.com/aws-amplify/amplify-js/issues/978. The
 * maintainers' answer to this exact requirement is to talk to the AWS SDK
 * directly, which is what this module does.
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
 * wildcard DNS entry, so local deploys force path-style addressing. This
 * mirrors what the handlers do in api/src/client/s3Client.ts.
 */
const localEndpoint = process.env.NEXT_PUBLIC_AWS_ENDPOINT;

/**
 * A provider rather than a static credentials object, because an upload can
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

const s3Client = new S3Client(clientConfig);

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
    client: s3Client,
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
  const response = await s3Client.send(
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
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: path,
      ...(contentDisposition
        ? { ResponseContentDisposition: contentDisposition }
        : {}),
    }),
    { expiresIn },
  );
