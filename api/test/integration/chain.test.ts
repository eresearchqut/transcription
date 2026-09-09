/**
 * End-to-end coverage of the upload chain against a running local stack
 * (ERP-5129). Every other suite in this workspace mocks the AWS SDK, so
 * nothing else checks that the S3 notification filters, the EventBridge rules
 * and the IAM grants in deployment/lib/api-stack.ts actually reach the
 * handlers. That wiring is what this file exercises.
 *
 * Requires `docker compose up -d` and a finished deploy. It is excluded from
 * `pnpm test` and runs via `pnpm test:integration`; see the README in this
 * directory for why it is not a Testcontainers suite.
 */
import { randomUUID } from "node:crypto";

import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { unmarshall } from "@aws-sdk/util-dynamodb";

import type { TranscriptDocument } from "../../src/util/transcript";

const endpoint = process.env.MINISTACK_ENDPOINT ?? "http://localhost:24566";
const region = process.env.AWS_REGION ?? "ap-southeast-2";
const stackName = process.env.API_STACK_NAME ?? "local-transcription";
const account = process.env.MINISTACK_ACCOUNT_ID ?? "000000000000";

// api-stack.ts names the bucket `${stackName}-${region}-${account}`, so it is
// derivable rather than needing a CloudFormation lookup. The table carries a
// CDK-generated suffix and is resolved by prefix below.
const bucket = `${stackName}-${region}-${account}`.toLowerCase();

const clientConfig = {
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};

const s3 = new S3Client(clientConfig);
const ddb = new DynamoDBClient(clientConfig);

const identityId = "researcher1001";

/** The chain settles in a few seconds locally; allow for a Lambda cold start. */
const CHAIN_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

let tableName: string;

/** Every artifact this suite creates, removed in afterAll. */
const createdKeys = new Set<string>();
const createdJobIds = new Set<string>();

const STACK_HINT =
  "Start the stack with `docker compose up -d` and wait for the deploy " +
  "(pnpm ministack:logs).";

const resolveTableName = async () => {
  let tableNames: string[];
  try {
    const { TableNames = [] } = await ddb.send(new ListTablesCommand({}));
    tableNames = TableNames;
  } catch (cause) {
    // A connection failure surfaces from the SDK as "AWS SDK error wrapper for
    // AggregateError", which says nothing about the stack being down.
    throw new Error(`Could not reach DynamoDB on ${endpoint}. ${STACK_HINT}`, {
      cause,
    });
  }
  const match = tableNames.find((name) =>
    name.startsWith(`${stackName}-Table`),
  );
  if (!match) {
    throw new Error(
      `No ${stackName}-Table* table on ${endpoint}. ${STACK_HINT}`,
    );
  }
  return match;
};

type UploadOptions = {
  targetLanguage?: string;
  generateSummary?: boolean;
  enablePiiRedaction?: boolean;
  languages?: string;
};

/**
 * Writes a `.upload` object the way the frontend does. The body is never
 * transcribed for real: MiniStack synthesises a transcript, so any bytes do.
 */
const upload = async ({
  targetLanguage = "",
  generateSummary = false,
  enablePiiRedaction = false,
  languages = "en-AU",
}: UploadOptions) => {
  const jobId = randomUUID();
  const key = `users/${identityId}/${jobId}.upload`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.alloc(1024, 7),
      ContentType: "audio/mpeg",
      ContentDisposition: 'attachment; filename = "integration.mp3"',
      Metadata: {
        filename: "integration.mp3",
        mimetype: "audio/mpeg",
        filetype: "userUploadedFile",
        languages,
        enablePiiRedaction: String(enablePiiRedaction),
        generateSummary: String(generateSummary),
        targetLanguage,
      },
    }),
  );
  createdKeys.add(key);
  createdJobIds.add(jobId);
  return jobId;
};

type JobRecord = {
  outputKey?: string;
  transcriptionResponse?: {
    TranscriptionJob?: { TranscriptionJobName?: string };
  };
  jobStatusUpdated?: { detail?: { TranscriptionJobStatus?: string } };
  downloadKey?: string;
  summaryKey?: string;
  translationKey?: string;
  translationJob?: { jobId: string; status: string; message?: string };
};

const readRecord = async (jobId: string): Promise<JobRecord | undefined> => {
  const { Item } = await ddb.send(
    new GetItemCommand({
      TableName: tableName,
      Key: { pk: { S: identityId }, sk: { S: jobId } },
    }),
  );
  return Item ? (unmarshall(Item) as JobRecord) : undefined;
};

/**
 * Polls the job record until `settled` is happy. Reports the last record seen
 * on timeout, so a failure names the stage the chain stopped at rather than
 * just "timed out".
 */
const waitForRecord = async (
  jobId: string,
  settled: (record: JobRecord) => boolean,
  description: string,
) => {
  const deadline = Date.now() + CHAIN_TIMEOUT_MS;
  let last: JobRecord | undefined;
  while (Date.now() < deadline) {
    last = await readRecord(jobId);
    if (last && settled(last)) return last;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Timed out after ${CHAIN_TIMEOUT_MS}ms waiting for ${description}. ` +
      `Last record: ${JSON.stringify(last, null, 2)}`,
  );
};

const getObject = (key: string) =>
  s3
    .send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    .then((result) => result.Body?.transformToString());

beforeAll(async () => {
  tableName = await resolveTableName();
}, 30_000);

afterAll(async () => {
  // beforeAll may have failed before resolving the table, in which case
  // nothing was created and there is nothing to clean up.
  if (!tableName) return;
  // Objects the chain produced are discovered rather than tracked, since the
  // handlers choose their own keys (notably the "redacted-" prefix).
  for (const jobId of createdJobIds) {
    for (const prefix of [
      `users/${identityId}/`,
      `transcription/${identityId}/`,
    ]) {
      const { Contents = [] } = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
      );
      for (const { Key } of Contents) {
        if (Key?.includes(jobId)) createdKeys.add(Key);
      }
    }
    await ddb.send(
      new DeleteItemCommand({
        TableName: tableName,
        Key: { pk: { S: identityId }, sk: { S: jobId } },
      }),
    );
  }
  if (createdKeys.size > 0) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: [...createdKeys].map((Key) => ({ Key })) },
      }),
    );
  }
}, 60_000);

describe("upload chain", () => {
  it(
    "transcribes, copies the output to the user prefix and summarises",
    async () => {
      const jobId = await upload({ generateSummary: true });

      const record = await waitForRecord(
        jobId,
        (r) => Boolean(r.downloadKey && r.summaryKey),
        "the transcript and summary keys",
      );

      // fileUploadHandler ran, so the users/*.upload notification filter fires.
      expect(
        record.transcriptionResponse?.TranscriptionJob?.TranscriptionJobName,
      ).toBe(`${identityId}_${jobId}`);
      expect(record.outputKey).toBe(
        `transcription/${identityId}/${jobId}.json`,
      );

      // transcriptionJobStateChangeHandler ran, so the EventBridge rule matches.
      expect(record.jobStatusUpdated?.detail?.TranscriptionJobStatus).toBe(
        "COMPLETED",
      );

      // copyOutputHandler ran, so the transcription*.json filter fires.
      expect(record.downloadKey).toBe(`users/${identityId}/${jobId}.json`);
      const transcript = JSON.parse(
        (await getObject(record.downloadKey as string)) ?? "",
      ) as TranscriptDocument;
      expect(transcript.results.transcripts.length).toBeGreaterThan(0);

      // summariseTranscriptionHandler ran, so the users/*.json filter fires and
      // the handler reached Bedrock. The body is not asserted: MiniStack
      // answers with a canned reply unless MINISTACK_BEDROCK_PROXY_URL is set.
      expect(record.summaryKey).toBe(`users/${identityId}/summary/${jobId}`);
      const summary = await getObject(record.summaryKey as string);
      expect(summary?.length).toBeGreaterThan(0);
    },
    CHAIN_TIMEOUT_MS,
  );

  it(
    "stores a translation when the target language matches the source",
    async () => {
      // en-AU maps to the Translate source code "en", so translateStartHandler
      // takes its source-equals-target branch and copies the transcript to the
      // translation key. That branch is the whole translation leg that can run
      // locally, because MiniStack has no Translate service (ERP-5116); a
      // foreign target language is covered by the unit tests instead.
      const jobId = await upload({ targetLanguage: "en" });

      const record = await waitForRecord(
        jobId,
        (r) => Boolean(r.translationKey),
        "the translation key",
      );

      expect(record.translationJob?.status).toBe("COMPLETED");
      expect(record.translationKey).toBe(
        `users/${identityId}/translations/${jobId}/en`,
      );
      const translated = JSON.parse(
        (await getObject(record.translationKey as string)) ?? "",
      ) as TranscriptDocument;
      expect(translated.results.transcripts.length).toBeGreaterThan(0);
    },
    CHAIN_TIMEOUT_MS,
  );

  it(
    "keeps the redacted output on the chain and the record on the bare job id",
    async () => {
      // Redaction makes Transcribe write "redacted-<jobId>.json". The key still
      // sits under transcription/, so the copy notification fires, and
      // normaliseJobId strips the prefix so the record keeps its own job id.
      const jobId = await upload({
        enablePiiRedaction: true,
        generateSummary: true,
      });

      const record = await waitForRecord(
        jobId,
        (r) => Boolean(r.downloadKey && r.summaryKey),
        "the redacted transcript and summary keys",
      );

      expect(record.downloadKey).toBe(
        `users/${identityId}/redacted-${jobId}.json`,
      );
      expect(record.summaryKey).toBe(`users/${identityId}/summary/${jobId}`);
    },
    CHAIN_TIMEOUT_MS,
  );
});
