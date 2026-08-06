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
  const batchItemFailures: DynamoDBBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records) {
    try {
      await project(record);
    } catch (error) {
      console.error("Failed to project usage record", {
        error,
        eventId: record.eventID,
      });
      if (record.dynamodb?.SequenceNumber) {
        batchItemFailures.push({
          itemIdentifier: record.dynamodb.SequenceNumber,
        });
      }
    }
  }

  return { batchItemFailures };
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
