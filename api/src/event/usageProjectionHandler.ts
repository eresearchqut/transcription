import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

import type {
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from "aws-lambda";
import type { Transcription } from "model";

import { getFeatureFlags } from "../client/featureFlagsClient";
import {
  markUsageRecordExpired,
  putUsageRecord,
} from "../repository/usageRepository";
import { toUsageRecord } from "../service/usageService";

export const handler = async (
  event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> => {
  // While the usage log is off the stream is consumed without recording
  // anything, so turning it back on leaves a gap rather than a backlog. A
  // failed read rejects the batch, which the event source mapping retries.
  const { usageLog } = await getFeatureFlags();
  if (!usageLog) {
    return { batchItemFailures: [] };
  }

  for (const record of event.Records) {
    try {
      await project(record);
    } catch (error) {
      console.error("Failed to project usage record", {
        error,
        eventId: record.eventID,
      });
      const sequenceNumber = record.dynamodb?.SequenceNumber;
      if (!sequenceNumber) {
        throw error;
      }
      // Lambda retries every record from this one, so the records after it
      // are applied after it rather than ahead of it.
      return { batchItemFailures: [{ itemIdentifier: sequenceNumber }] };
    }
  }

  return { batchItemFailures: [] };
};

const project = async (record: DynamoDBRecord) => {
  const expired = record.eventName === "REMOVE";
  const image = expired ? record.dynamodb?.OldImage : record.dynamodb?.NewImage;
  if (!image) {
    return;
  }

  const transcription = unmarshall(
    image as Record<string, AttributeValue>,
  ) as Transcription;
  if (!transcription.pk || !transcription.sk) {
    console.error("Skipping record with no key", { eventId: record.eventID });
    return;
  }
  // Without this, a job uploaded while the log was off would be recorded when
  // TTL removes it, if the log had been turned on since.
  if (!transcription.usageLogged) {
    return;
  }

  const usageRecord = toUsageRecord(transcription);
  await putUsageRecord(usageRecord);

  if (expired) {
    await markUsageRecordExpired(
      usageRecord.pk,
      usageRecord.sk,
      new Date(
        (record.dynamodb?.ApproximateCreationDateTime ?? Date.now() / 1000) *
          1000,
      ).toISOString(),
    );
  }
};
