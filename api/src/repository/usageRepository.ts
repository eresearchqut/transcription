import {
  ConditionalCheckFailedException,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

import type { UsageRecord } from "model";

import dynamoDBClient from "./dynamoDBClient";

const usageTableName = process.env.USAGE_TABLE_NAME || "transcription-usage";

const WRITE_ONCE_ATTRIBUTES = new Set([
  "startedAt",
  "usageMonth",
  "completedAt",
]);

export const putUsageRecord = async (record: UsageRecord) => {
  const { pk, sk, updatedAt, ...attributes } = record;
  const entries = Object.entries(attributes).filter(
    ([, value]) => value !== undefined,
  );

  const assignments = entries.map(([name], index) =>
    WRITE_ONCE_ATTRIBUTES.has(name)
      ? `#n${index} = if_not_exists(#n${index}, :v${index})`
      : `#n${index} = :v${index}`,
  );

  try {
    await dynamoDBClient.send(
      new UpdateItemCommand({
        TableName: usageTableName,
        Key: marshall({ pk, sk }),
        UpdateExpression: `set ${[...assignments, "#updatedAt = :updatedAt"].join(", ")}`,
        ConditionExpression:
          "attribute_not_exists(#updatedAt) or #updatedAt <= :updatedAt",
        ExpressionAttributeNames: {
          ...Object.fromEntries(
            entries.map(([name], index) => [`#n${index}`, name]),
          ),
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: marshall(
          {
            ...Object.fromEntries(
              entries.map(([, value], index) => [`:v${index}`, value]),
            ),
            ":updatedAt": updatedAt,
          },
          { removeUndefinedValues: true },
        ),
      }),
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      console.log(`Skipped stale usage projection for ${pk} ${sk}`);
      return;
    }
    throw error;
  }
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
