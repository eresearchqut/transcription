import { GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import type { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import type { UsageRecord } from "model";

import { handler } from "../../src/event/usageProjectionHandler";
import dynamoDBClient from "../../src/repository/dynamoDBClient";

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
  uploadEvent: { object: { key: "users/x/y.upload", size: 1292288 } },
  ...overrides,
});

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

  it("ignores a redelivered older state", async () => {
    await handler(
      event(
        streamRecord(
          "INSERT",
          transcriptionRecord({
            date: "2026-08-06T01:30:00.000Z",
            audioSeconds: 612.5,
            jobStatusUpdated: {
              detail: { TranscriptionJobStatus: "COMPLETED" },
            },
          }),
        ),
      ),
    );

    const result = await handler(
      event(streamRecord("MODIFY", transcriptionRecord(), "2")),
    );

    expect(result.batchItemFailures).toEqual([]);
    const record = await getUsageRecord();
    expect(record?.status).toEqual("COMPLETED");
    expect(record?.audioSeconds).toEqual(612.5);
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

  it("reports the failed item rather than the whole batch", async () => {
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

  it("skips a record with no image", async () => {
    const result = await handler(
      event({ eventID: "e", eventName: "INSERT", dynamodb: {} }),
    );

    expect(result.batchItemFailures).toEqual([]);
  });
});
