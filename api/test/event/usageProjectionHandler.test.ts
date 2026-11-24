import { GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import type { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { FEATURES_OFF, type UsageRecord } from "model";

import { getFeatureFlags } from "../../src/client/featureFlagsClient";
import { handler } from "../../src/event/usageProjectionHandler";
import dynamoDBClient from "../../src/repository/dynamoDBClient";

jest.mock("../../src/client/featureFlagsClient", () => ({
  getFeatureFlags: jest.fn(),
}));

const mockGetFeatureFlags = getFeatureFlags as jest.MockedFunction<
  typeof getFeatureFlags
>;

const usageTableName = process.env.USAGE_TABLE_NAME || "transcription-usage";

const IDENTITY_ID = "76c65a59-1c57-489b-be96-020ceaa9675a";
const JOB_ID = "2e9b38b5-1df0-4841-8308-f174fb88aac7";

const transcriptionRecord = (overrides: Record<string, unknown> = {}) => ({
  pk: IDENTITY_ID,
  sk: JOB_ID,
  date: "2026-08-06T01:02:03.000Z",
  metadata: {
    filename: "Welcome.wav",
    filetype: "userUploadedFile",
    mimetype: "audio/wav",
    languages: "en-AU",
    enablepiiredaction: "false",
    generatesummary: "false",
    rpid: "RPID-1234",
  },
  rpid: "RPID-1234",
  usageLogged: true,
  uploadEvent: { object: { key: "users/x/y.upload", size: 1292288 } },
  ...overrides,
});

/** A job recorded before jobs noted whether the usage log was on. */
const unstampedRecord = () => {
  const { usageLogged: _, ...record } = transcriptionRecord();
  return record;
};

const APPROXIMATE_CREATION_TIME = 1786000000;

const streamRecord = (
  eventName: DynamoDBRecord["eventName"],
  image: Record<string, unknown>,
  sequenceNumber = "1",
): DynamoDBRecord => ({
  eventID: `event-${sequenceNumber}`,
  eventName,
  dynamodb: {
    SequenceNumber: sequenceNumber,
    ApproximateCreationDateTime: APPROXIMATE_CREATION_TIME,
    ...(eventName === "REMOVE"
      ? { OldImage: marshall(image) }
      : { NewImage: marshall(image) }),
  },
});

const event = (...records: DynamoDBRecord[]) =>
  ({ Records: records }) as DynamoDBStreamEvent;

const getUsageRecord = () =>
  dynamoDBClient
    .send(
      new GetItemCommand({
        TableName: usageTableName,
        Key: marshall({ pk: `USER#${IDENTITY_ID}`, sk: `JOB#${JOB_ID}` }),
      }),
    )
    .then(({ Item }) => Item && (unmarshall(Item) as UsageRecord));

describe("usageProjectionHandler", () => {
  beforeEach(() => {
    mockGetFeatureFlags.mockResolvedValue({ ...FEATURES_OFF, usageLog: true });
  });

  it("projects a new transcription record into the usage table", async () => {
    const result = await handler(
      event(streamRecord("INSERT", transcriptionRecord())),
    );

    expect(result.batchItemFailures).toEqual([]);
    expect(await getUsageRecord()).toEqual(
      expect.objectContaining({
        identityId: IDENTITY_ID,
        jobId: JOB_ID,
        rpid: "RPID-1234",
        bytesUploaded: 1292288,
        usageMonth: "2026-08",
        startedAt: "2026-08-06T01:02:03.000Z",
      }),
    );
  });

  it("accumulates metered units as the job progresses", async () => {
    await handler(event(streamRecord("INSERT", transcriptionRecord())));
    await handler(
      event(
        streamRecord(
          "MODIFY",
          transcriptionRecord({
            date: "2026-08-06T01:30:00.000Z",
            audioSeconds: 612.5,
            jobStatusUpdated: {
              detail: { TranscriptionJobStatus: "COMPLETED" },
            },
          }),
          "2",
        ),
      ),
    );

    const record = await getUsageRecord();
    expect(record).toEqual(
      expect.objectContaining({
        audioSeconds: 612.5,
        status: "COMPLETED",
        completedAt: "2026-08-06T01:30:00.000Z",
        updatedAt: "2026-08-06T01:30:00.000Z",
        startedAt: "2026-08-06T01:02:03.000Z",
      }),
    );
  });

  it("keeps the latest image when its handler stamped it first", async () => {
    await handler(
      event(
        streamRecord("INSERT", transcriptionRecord(), "1"),
        streamRecord(
          "MODIFY",
          transcriptionRecord({
            date: "2026-08-06T01:30:00.040Z",
            audioSeconds: 612.5,
          }),
          "2",
        ),
        streamRecord(
          "MODIFY",
          transcriptionRecord({
            date: "2026-08-06T01:30:00.000Z",
            audioSeconds: 612.5,
            jobStatusUpdated: {
              detail: { TranscriptionJobStatus: "COMPLETED" },
            },
          }),
          "3",
        ),
      ),
    );

    expect(await getUsageRecord()).toEqual(
      expect.objectContaining({
        status: "COMPLETED",
        audioSeconds: 612.5,
        completedAt: "2026-08-06T01:30:00.000Z",
      }),
    );
  });

  it("keeps the usage record when the transcription record expires", async () => {
    await handler(event(streamRecord("INSERT", transcriptionRecord())));
    await handler(
      event(
        streamRecord(
          "REMOVE",
          transcriptionRecord({
            date: "2026-08-20T01:02:03.000Z",
            audioSeconds: 612.5,
          }),
          "2",
        ),
      ),
    );

    const record = await getUsageRecord();
    expect(record?.audioSeconds).toEqual(612.5);
    expect(record?.expiredAt).toEqual(
      new Date(APPROXIMATE_CREATION_TIME * 1000).toISOString(),
    );
  });

  it("is queryable by research project after the job has expired", async () => {
    await handler(event(streamRecord("INSERT", transcriptionRecord())));
    await handler(event(streamRecord("REMOVE", transcriptionRecord(), "2")));

    const { Items } = await dynamoDBClient.send(
      new QueryCommand({
        TableName: usageTableName,
        IndexName: "byRpid",
        KeyConditionExpression: "#rpid = :rpid",
        ExpressionAttributeNames: { "#rpid": "rpid" },
        ExpressionAttributeValues: marshall({ ":rpid": "RPID-1234" }),
      }),
    );

    expect(Items).toHaveLength(1);
    expect(unmarshall(Items![0])).toEqual(
      expect.objectContaining({ jobId: JOB_ID }),
    );
  });

  it("is queryable by reporting period", async () => {
    await handler(event(streamRecord("INSERT", transcriptionRecord())));

    const { Items } = await dynamoDBClient.send(
      new QueryCommand({
        TableName: usageTableName,
        IndexName: "byPeriod",
        KeyConditionExpression: "#usageMonth = :usageMonth",
        ExpressionAttributeNames: { "#usageMonth": "usageMonth" },
        ExpressionAttributeValues: marshall({ ":usageMonth": "2026-08" }),
      }),
    );

    expect(Items).toHaveLength(1);
  });

  it("skips a record with no key", async () => {
    const result = await handler(
      event(
        streamRecord("INSERT", { sk: JOB_ID }, "1"),
        streamRecord("INSERT", transcriptionRecord(), "2"),
      ),
    );

    expect(result.batchItemFailures).toEqual([]);
    expect(await getUsageRecord()).toEqual(
      expect.objectContaining({ jobId: JOB_ID }),
    );
  });

  it("stops at a failed record so the retry applies the batch in order", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const send = jest
      .spyOn(dynamoDBClient, "send")
      .mockRejectedValueOnce(new Error("ThrottlingException") as never);
    const batch = event(
      streamRecord("INSERT", transcriptionRecord(), "1"),
      streamRecord(
        "MODIFY",
        transcriptionRecord({
          date: "2026-08-06T01:30:00.000Z",
          jobStatusUpdated: { detail: { TranscriptionJobStatus: "COMPLETED" } },
        }),
        "2",
      ),
    );

    const failed = await handler(batch);

    expect(failed.batchItemFailures).toEqual([{ itemIdentifier: "1" }]);
    expect(await getUsageRecord()).toBeUndefined();

    send.mockRestore();
    const retried = await handler(batch);

    expect(retried.batchItemFailures).toEqual([]);
    expect(await getUsageRecord()).toEqual(
      expect.objectContaining({
        status: "COMPLETED",
        startedAt: "2026-08-06T01:02:03.000Z",
      }),
    );
  });

  it("skips a record with no image", async () => {
    const result = await handler(
      event({ eventID: "e", eventName: "INSERT", dynamodb: {} }),
    );

    expect(result.batchItemFailures).toEqual([]);
  });

  it("records nothing while the usage log is off", async () => {
    mockGetFeatureFlags.mockResolvedValue(FEATURES_OFF);

    const result = await handler(
      event(streamRecord("INSERT", transcriptionRecord())),
    );

    expect(result.batchItemFailures).toEqual([]);
    expect(await getUsageRecord()).toBeUndefined();
  });

  it.each([
    [
      "while the usage log was off",
      transcriptionRecord({ usageLogged: false }),
    ],
    ["before jobs noted the usage log", unstampedRecord()],
  ])("doesn't record a job uploaded %s, even when it expires", async (_, image) => {
    const result = await handler(
      event(
        streamRecord("INSERT", image, "1"),
        streamRecord("MODIFY", image, "2"),
        streamRecord("REMOVE", image, "3"),
      ),
    );

    expect(result.batchItemFailures).toEqual([]);
    expect(await getUsageRecord()).toBeUndefined();
  });

  it("fails the batch when the feature flags can't be read", async () => {
    mockGetFeatureFlags.mockRejectedValue(new Error("ThrottlingException"));

    await expect(
      handler(event(streamRecord("INSERT", transcriptionRecord()))),
    ).rejects.toThrow("ThrottlingException");
    expect(await getUsageRecord()).toBeUndefined();
  });
});
