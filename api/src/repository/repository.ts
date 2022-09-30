import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb/dist-types/models/models_0";
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
      })
    )
    .then((result) => result.Item && unmarshall(result.Item));

export const putResource = (
  pk: string,
  sk: string,
  attributes: Record<string, unknown>
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
          ttl: Math.floor(+new Date() / 1000) + TTL_DELTA,
        },
        { removeUndefinedValues: true }
      ),
    })
  );

export const updateResource = (
  pk: string,
  sk: string,
  attributeName: string,
  attributeValue: string
) =>
  dynamoDBClient.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({ pk, sk }),
      ReturnValues: "UPDATED_NEW",
      UpdateExpression:
        "set #attributeName = :attributeValue, #date = :date, #ttl = :ttl",
      ExpressionAttributeNames: {
        "#attributeName": attributeName,
        "#date": "date",
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: marshall(
        {
          ":attributeValue": attributeValue,
          ":date": new Date().toISOString(),
          ":ttl": Math.floor(+new Date() / 1000) + TTL_DELTA,
        },
        { removeUndefinedValues: true }
      ),
    })
  );

export const deleteResource = (pk: string, sk: string) =>
  dynamoDBClient.send(
    new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ pk, sk }),
    })
  );

export const getResources = async (
  pk: string,
  exclusiveStartKey?: Record<string, AttributeValue>
) => {
  const items: Record<string, any> = [];
  let lastEvaluatedKey;
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
      })
    );
    (Items ?? [])
      .map((item) => unmarshall(item))
      .forEach((item) => items.push(item));
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return items;
};
