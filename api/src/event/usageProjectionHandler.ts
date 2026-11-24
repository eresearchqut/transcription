import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

import type {
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from "aws-lambda";
import type { Transcription } from "model";

import {
  markUsageRecordExpired,
  putUsageRecord,
} from "../repository/usageRepository";
import { toUsageRecord } from "../service/usageService";

export const handler = async (
  event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> => {
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
  // Whether a job is recorded is decided once, by the upload handler. Reading
  // the flag here as well would skip changes to a recorded job whenever this
  // container's copy of the flag lagged the upload handler's. A job uploaded
  // while the log was off is never recorded, even when TTL removes it after
  // the log has been turned on.
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
