/**
 * Probes a MiniStack build for the exact Amazon Transcribe surface this repo
 * depends on. Deliberately standalone: it needs no CDK deploy, no Cognito and
 * no Lambda, so it can be run against a candidate MiniStack image well before
 * the stack itself is deployable locally.
 *
 * Usage:
 *   docker compose up -d --wait
 *   pnpm ministack:probe
 *
 * To test a specific build:
 *   MINISTACK_IMAGE=<image> docker compose up -d --force-recreate --wait
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

// The AWS SDK clients live in the api workspace; resolve from there rather
// than adding dependencies to the repo root.
const require = createRequire(
  new URL("../../api/package.json", import.meta.url),
);

const { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand } =
  require("@aws-sdk/client-s3");
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  LanguageCode,
  RedactionOutput,
  RedactionType,
  PiiEntityType,
} = require("@aws-sdk/client-transcribe");

const endpoint = process.env.MINISTACK_ENDPOINT ?? "http://localhost:24566";
const region = process.env.AWS_REGION ?? "ap-southeast-2";
const credentials = { accessKeyId: "test", secretAccessKey: "test" };

const s3 = new S3Client({
  region,
  endpoint,
  credentials,
  forcePathStyle: true,
});
const transcribe = new TranscribeClient({ region, endpoint, credentials });

const UPLOAD_BUCKET = "probe-uploads";
const OUTPUT_BUCKET = "probe-transcribe";
// Matches the custom:qutIdentityId attribute the frontend uses as user.id
// (auth-context.tsx:68), not a Cognito identity pool id. Transcribe job names
// must satisfy ^[0-9a-zA-Z._-]+$, so a colon here would be rejected.
const IDENTITY_ID = "probeuser001";
// Transcribe rejects a duplicate job name, so each run gets its own suffix.
const RUN_ID = Date.now().toString(36);
const EVENT_RULE = "probe-transcribe-rule";
const EVENT_QUEUE = "probe-transcribe-events";

/**
 * EventBridge and SQS are driven through the AWS CLI: neither client is a
 * dependency of the api workspace and this probe should not add one.
 */
const awsCli = (args) => {
  const output = execFileSync(
    "aws",
    [
      "--endpoint-url",
      endpoint,
      "--region",
      region,
      "--output",
      "json",
      ...args,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_PAGER: "",
      },
    },
  ).trim();
  return output ? JSON.parse(output) : undefined;
};

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
};

const ensureBucket = async (Bucket) => {
  try {
    await s3.send(
      new CreateBucketCommand({
        Bucket,
        CreateBucketConfiguration: { LocationConstraint: region },
      }),
    );
  } catch (error) {
    if (!/BucketAlreadyOwnedByYou|BucketAlreadyExists/.test(String(error))) {
      throw error;
    }
  }
};

/**
 * A minimal WAV so the emulator has real bytes to work with if it inspects the
 * media. 0.1s of silence, 8kHz mono 16-bit PCM.
 */
const silentWav = () => {
  const samples = 800;
  const dataBytes = samples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
};

const waitForJob = async (TranscriptionJobName, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    const { TranscriptionJob } = await transcribe.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName }),
    );
    last = TranscriptionJob;
    const status = TranscriptionJob?.TranscriptionJobStatus;
    if (status === "COMPLETED" || status === "FAILED") return TranscriptionJob;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return last;
};

/**
 * Mirrors fileUploadHandler.ts: same MediaFileUri form, same Settings, same
 * OutputBucketName/OutputKey, same language and redaction parameter shapes.
 */
const startJob = async ({ jobId, objectKey, languageParams, piiParams }) => {
  const outputKey = `transcription/${IDENTITY_ID}/${jobId}.json`;
  const params = {
    TranscriptionJobName: `${IDENTITY_ID}_${jobId}`,
    ...languageParams,
    ...piiParams,
    Media: {
      MediaFileUri: `https://s3-${region}.amazonaws.com/${UPLOAD_BUCKET}/${objectKey}`,
    },
    OutputBucketName: OUTPUT_BUCKET,
    OutputKey: outputKey,
    Settings: {
      ShowSpeakerLabels: true,
      ShowAlternatives: true,
      MaxAlternatives: 10,
      MaxSpeakerLabels: 10,
    },
  };
  const response = await transcribe.send(
    new StartTranscriptionJobCommand(params),
  );
  return { response, outputKey };
};

/**
 * Routes Transcribe job state changes to an SQS queue using the same event
 * pattern the CDK stack puts on its rules (api-stack.ts:316 and :532), so a
 * pass here means those rules would fire once the stack is deployed.
 */
const setupEventCapture = () => {
  const { QueueUrl } = awsCli([
    "sqs",
    "create-queue",
    "--queue-name",
    EVENT_QUEUE,
  ]);
  const { Attributes } = awsCli([
    "sqs",
    "get-queue-attributes",
    "--queue-url",
    QueueUrl,
    "--attribute-names",
    "QueueArn",
  ]);
  const queueArn = Attributes.QueueArn;

  awsCli([
    "sqs",
    "set-queue-attributes",
    "--queue-url",
    QueueUrl,
    "--attributes",
    JSON.stringify({
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: queueArn,
          },
        ],
      }),
    }),
  ]);

  awsCli([
    "events",
    "put-rule",
    "--name",
    EVENT_RULE,
    "--event-pattern",
    JSON.stringify({
      source: ["aws.transcribe"],
      "detail-type": ["Transcribe Job State Change"],
    }),
  ]);

  awsCli([
    "events",
    "put-targets",
    "--rule",
    EVENT_RULE,
    "--targets",
    JSON.stringify([{ Id: "probe", Arn: queueArn }]),
  ]);

  return QueueUrl;
};

/** Drains every event the rule captured, keyed by TranscriptionJobName. */
const drainEvents = async (QueueUrl, attempts = 10) => {
  const events = new Map();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = awsCli([
      "sqs",
      "receive-message",
      "--queue-url",
      QueueUrl,
      "--max-number-of-messages",
      "10",
      "--wait-time-seconds",
      "1",
    ]);
    const messages = result?.Messages ?? [];
    for (const message of messages) {
      try {
        const envelope = JSON.parse(message.Body);
        const name = envelope?.detail?.TranscriptionJobName?.replace(/'/g, "");
        if (name) events.set(name, envelope);
      } catch {
        // Non-JSON payloads are not events we care about.
      }
      awsCli([
        "sqs",
        "delete-message",
        "--queue-url",
        QueueUrl,
        "--receipt-handle",
        message.ReceiptHandle,
      ]);
    }
    if (!messages.length)
      await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return events;
};

const scenarios = [
  {
    name: "single language (LanguageCode)",
    jobId: "probe-single",
    languageParams: { LanguageCode: LanguageCode.EN_AU },
    piiParams: {},
    redacted: false,
  },
  {
    name: "multi-language identification (IdentifyMultipleLanguages)",
    jobId: "probe-multi",
    languageParams: {
      IdentifyMultipleLanguages: true,
      LanguageOptions: [LanguageCode.EN_AU, LanguageCode.FR_FR],
    },
    piiParams: {},
    redacted: false,
  },
  {
    name: "automatic identification (IdentifyLanguage)",
    jobId: "probe-auto",
    languageParams: { IdentifyLanguage: true },
    piiParams: {},
    redacted: false,
  },
  {
    name: "PII redaction (ContentRedaction)",
    jobId: "probe-redacted",
    languageParams: { LanguageCode: LanguageCode.EN_US },
    piiParams: {
      ContentRedaction: {
        RedactionOutput: RedactionOutput.REDACTED,
        RedactionType: RedactionType.PII,
        PiiEntityTypes: [PiiEntityType.ALL],
      },
    },
    redacted: true,
  },
];

const main = async () => {
  console.log(`Probing ${endpoint} (region ${region})\n`);

  await ensureBucket(UPLOAD_BUCKET);
  await ensureBucket(OUTPUT_BUCKET);
  record("create source and output buckets", true);

  let queueUrl;
  try {
    queueUrl = setupEventCapture();
    record("route Transcribe events to SQS via EventBridge rule", true);
  } catch (error) {
    record(
      "route Transcribe events to SQS via EventBridge rule",
      false,
      String(error).split("\n").at(0),
    );
  }

  for (const scenario of scenarios) {
    const jobId = `${scenario.jobId}-${RUN_ID}`;
    const objectKey = `users/${IDENTITY_ID}/${jobId}.upload`;
    await s3.send(
      new PutObjectCommand({
        Bucket: UPLOAD_BUCKET,
        Key: objectKey,
        Body: silentWav(),
        ContentType: "audio/wav",
      }),
    );

    let started;
    try {
      started = await startJob({ ...scenario, jobId, objectKey });
      record(`StartTranscriptionJob: ${scenario.name}`, true);
    } catch (error) {
      record(`StartTranscriptionJob: ${scenario.name}`, false, String(error));
      continue;
    }

    // transcriptionService.jobStarted persists these off the start response.
    const startedJob = started.response?.TranscriptionJob;
    record(
      `start response carries TranscriptionJob: ${scenario.name}`,
      Boolean(startedJob?.TranscriptionJobName),
      startedJob?.TranscriptionJobStatus,
    );

    const job = await waitForJob(`${IDENTITY_ID}_${jobId}`);
    const status = job?.TranscriptionJobStatus;
    record(
      `job reaches COMPLETED: ${scenario.name}`,
      status === "COMPLETED",
      status === "FAILED" ? job?.FailureReason : status,
    );
    if (status !== "COMPLETED") continue;

    // translateStartHandler resolves the source language from exactly these.
    const language = job?.LanguageCode ?? job?.LanguageCodes?.[0]?.LanguageCode;
    record(
      `GetTranscriptionJob resolves a language: ${scenario.name}`,
      Boolean(language),
      language,
    );

    if (scenario.redacted) {
      record(
        "redacted job reports ContentRedaction",
        job?.ContentRedaction != null,
      );
    }

    // translateStartHandler prepends "redacted-" for redacted jobs.
    const expectedKey = `transcription/${IDENTITY_ID}/${
      scenario.redacted ? "redacted-" : ""
    }${jobId}.json`;
    let body;
    try {
      body = await s3
        .send(new GetObjectCommand({ Bucket: OUTPUT_BUCKET, Key: expectedKey }))
        .then((result) => result.Body?.transformToString());
      record(
        `output written to OutputKey: ${scenario.name}`,
        Boolean(body),
        expectedKey,
      );
    } catch (error) {
      record(
        `output written to OutputKey: ${scenario.name}`,
        false,
        `${expectedKey}: ${error}`,
      );
      continue;
    }

    try {
      const document = JSON.parse(body);
      const transcript = document?.results?.transcripts?.at(0)?.transcript;
      // summariseTranscriptionHandler reads results.transcripts[0].transcript.
      record(
        `output has results.transcripts[0].transcript: ${scenario.name}`,
        typeof transcript === "string",
      );
      // transcript.ts rebuilds translations from results.segments.
      record(
        `output has results.segments: ${scenario.name}`,
        Array.isArray(document?.results?.segments),
        `${document?.results?.segments?.length ?? 0} segments`,
      );
      // Settings.ShowSpeakerLabels was requested.
      record(
        `output has results.speaker_labels: ${scenario.name}`,
        document?.results?.speaker_labels != null,
      );
    } catch (error) {
      record(`output parses as JSON: ${scenario.name}`, false, String(error));
    }
  }

  if (queueUrl) {
    const events = await drainEvents(queueUrl);
    for (const scenario of scenarios) {
      const jobName = `${IDENTITY_ID}_${scenario.jobId}-${RUN_ID}`;
      const envelope = events.get(jobName);
      record(
        `EventBridge event fired: ${scenario.name}`,
        Boolean(envelope),
        envelope ? undefined : "no matching event captured",
      );
      if (!envelope) continue;
      record(
        `event source is aws.transcribe: ${scenario.name}`,
        envelope.source === "aws.transcribe",
        envelope.source,
      );
      record(
        `event detail-type is Transcribe Job State Change: ${scenario.name}`,
        envelope["detail-type"] === "Transcribe Job State Change",
        envelope["detail-type"],
      );
      // transcriptionJobStateChangeHandler and translateStartHandler both read
      // event.detail as a TranscriptionJob.
      record(
        `event detail carries job status: ${scenario.name}`,
        Boolean(envelope.detail?.TranscriptionJobStatus),
        envelope.detail?.TranscriptionJobStatus,
      );
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  if (failed.length) {
    console.log("\nFailures:");
    for (const failure of failed) {
      console.log(
        `  - ${failure.name}${failure.detail ? `: ${failure.detail}` : ""}`,
      );
    }
  }
  process.exit(failed.length ? 1 : 0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
