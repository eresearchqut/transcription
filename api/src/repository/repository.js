const {
    GetItemCommand,
    PutItemCommand,
    DeleteItemCommand,
    QueryCommand
} = require("@aws-sdk/client-dynamodb");
const dynamoDBClient = require("./dynamoDBClient");
const {marshall, unmarshall} = require("@aws-sdk/util-dynamodb");
const tableName = process.env.TABLE_NAME || "transcription";

const getResource = (pk, sk) => dynamoDBClient
    .send(new GetItemCommand({
        TableName: tableName,
        Key: marshall({pk, sk})
    }))
    .then(result => result.Item && unmarshall(result.Item));


const putResource = (pk, sk, data) =>
    dynamoDBClient
        .send(new PutItemCommand({
            TableName: tableName,
            Item: marshall({
                pk, sk, data,
                date: new Date().toISOString(),
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
        items.push(Items.map(item => unmarshall(item)));
        lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return items;
}


module.exports = {
    deleteResource,
    getResource,
    getResources,
    putResource
};
