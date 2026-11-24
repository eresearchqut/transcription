import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

import type { UsageRecord } from "model";

import dynamoDBClient from "./dynamoDBClient";

const usageTableName = process.env.USAGE_TABLE_NAME || "transcription-usage";

const WRITE_ONCE_ATTRIBUTES = new Set([
  "startedAt",
  "usageMonth",
  "completedAt",
]);

/**
 * Writes a job's usage from one stream image. The stream delivers a job's
 * images in the order DynamoDB applied them, and each image is complete, so
 * the latest write is the job's current state. The images' dates can't order
 * them, because each handler stamps its write before sending it, and two
 * handlers' writes can be applied in the opposite order.
 */
export const putUsageRecord = async (record: UsageRecord) => {
  const { pk, sk, ...attributes } = record;
  const entries = Object.entries(attributes).filter(
    ([, value]) => value !== undefined,
  );

  const assignments = entries.map(([name], index) =>
    WRITE_ONCE_ATTRIBUTES.has(name)
      ? `#n${index} = if_not_exists(#n${index}, :v${index})`
      : `#n${index} = :v${index}`,
  );

  await dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: usageTableName,
      Key: marshall({ pk, sk }),
      UpdateExpression: `set ${assignments.join(", ")}`,
      ExpressionAttributeNames: Object.fromEntries(
        entries.map(([name], index) => [`#n${index}`, name]),
      ),
      ExpressionAttributeValues: marshall(
        Object.fromEntries(
          entries.map(([, value], index) => [`:v${index}`, value]),
        ),
        { removeUndefinedValues: true },
      ),
    }),
  );
};

export const markUsageRecordExpired = (
  pk: string,
  sk: string,
  expiredAt: string,
) =>
  dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: usageTableName,
      Key: marshall({ pk, sk }),
      UpdateExpression:
        "set #expiredAt = if_not_exists(#expiredAt, :expiredAt)",
      ExpressionAttributeNames: { "#expiredAt": "expiredAt" },
      ExpressionAttributeValues: marshall({ ":expiredAt": expiredAt }),
    }),
  );
