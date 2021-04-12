const {
    GetItemCommand,
    PutItemCommand,
    DeleteItemCommand,
    UpdateItemCommand,
    QueryCommand
} = require("@aws-sdk/client-dynamodb");
const dynamoDBClient = require("./dynamoDBClient");
const {marshall, unmarshall} = require("@aws-sdk/util-dynamodb");
const tableName = process.env.TABLE_NAME || "transcription";
const TTL_DELTA = 60 * 60 * 24 * 14; // 14 days

const getResource = (pk, sk) => dynamoDBClient
    .send(new GetItemCommand({
        TableName: tableName,
        Key: marshall({pk, sk})
    }))
    .then(result => result.Item && unmarshall(result.Item));


const putResource = (pk, sk, attributes) =>
    dynamoDBClient
        .send(new PutItemCommand({
            TableName: tableName,
            Item: marshall({
                pk, sk, ...attributes,
                date: new Date().toISOString(),
                ttl: (Math.floor(+new Date() / 1000) + TTL_DELTA).toString()
            }, {removeUndefinedValues: true})
        }));

const updateResource = (pk, sk, attributeName, attributeValue) => dynamoDBClient
    .send(new UpdateItemCommand({
        TableName: tableName,
        Key: marshall({pk, sk}),
        ReturnValues: "UPDATED_NEW",
        UpdateExpression: "set #attributeName = :attributeValue, #date = :date, #ttl = :ttl",
        ExpressionAttributeNames: {"#attributeName": attributeName, "#date": 'date', "#ttl": 'ttl'},
        ExpressionAttributeValues: marshall({
            ":attributeValue": attributeValue,
            ":date": new Date().toISOString(),
            ":ttl": (Math.floor(+new Date() / 1000) + TTL_DELTA).toString()
        }, {removeUndefinedValues: true})
    }));

const deleteResource = (pk, sk) => dynamoDBClient
    .send(new DeleteItemCommand({
        TableName: tableName,
        Key: marshall({pk, sk})
    }));

const getResources = async (pk, exclusiveStartKey) => {
    let lastEvaluatedKey;
    let items = [];
    do {
        const {LastEvaluatedKey, Items} = await dynamoDBClient
            .send(new QueryCommand({
                TableName: tableName,
                ExclusiveStartKey: exclusiveStartKey,
                KeyConditionExpression: '#pk = :pk',
                ExpressionAttributeNames: {
                    '#pk': 'pk'
                },
                ExpressionAttributeValues: marshall({
                    ':pk': pk
                })
            }));
        Items.map(item => unmarshall(item)).forEach(item => items.push(item));
        lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}


module.exports = {
    deleteResource,
    getResource,
    getResources,
    putResource,
    updateResource
};
