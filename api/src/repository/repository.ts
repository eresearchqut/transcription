import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

import dynamoDBClient from "./dynamoDBClient";

const tableName = process.env.TABLE_NAME || "transcription";
const TTL_DELTA = 60 * 60 * 24 * 14; // 14 days

export const getResource = (pk: string, sk: string) =>
  dynamoDBClient
    .send(
      new GetItemCommand({
        TableName: tableName,
        Key: marshall({ pk, sk }),
      }),
    )
    .then((result) => result.Item && unmarshall(result.Item));

export const putResource = (
  pk: string,
  sk: string,
  attributes: Record<string, unknown>,
) =>
  dynamoDBClient.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(
        {
          pk,
          sk,
          ...attributes,
          date: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + TTL_DELTA,
        },
        { removeUndefinedValues: true },
      ),
    }),
  );

export const updateResources = (
  pk: string,
  sk: string,
  attributes: Record<string, string | number | object | undefined>,
) => {
  const entries = Object.entries(attributes).filter(
    ([, value]) => value !== undefined,
  );
  const assignments = entries.map((_, index) => `#n${index} = :v${index}`);
  return dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({ pk, sk }),
      ReturnValues: "UPDATED_NEW",
      UpdateExpression: `set ${[...assignments, "#date = :date", "#ttl = :ttl"].join(", ")}`,
      ExpressionAttributeNames: {
        ...Object.fromEntries(
          entries.map(([name], index) => [`#n${index}`, name]),
        ),
        "#date": "date",
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: marshall(
        {
          ...Object.fromEntries(
            entries.map(([, value], index) => [`:v${index}`, value]),
          ),
          ":date": new Date().toISOString(),
          ":ttl": Math.floor(Date.now() / 1000) + TTL_DELTA,
        },
        { removeUndefinedValues: true },
      ),
    }),
  );
};

export const updateResource = (
  pk: string,
  sk: string,
  attributeName: string,
  attributeValue: string | object,
) => updateResources(pk, sk, { [attributeName]: attributeValue });

export const deleteResource = (pk: string, sk: string) =>
  dynamoDBClient.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ pk, sk }),
    }),
  );

export const getResources = async (
  pk: string,
  exclusiveStartKey?: Record<string, AttributeValue>,
) => {
  const items: Record<string, any> = [];
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;
  do {
    const { LastEvaluatedKey, Items } = await dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: marshall({
          ":pk": pk,
        }),
      }),
    );
    for (const item of Items ?? []) {
      items.push(unmarshall(item));
    }
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
};
