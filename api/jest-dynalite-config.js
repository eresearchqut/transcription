module.exports = {
    tables: [
        {
            TableName: "transcription",
            KeySchema: [{AttributeName: "pk", KeyType: "HASH"}, {AttributeName: "sk", KeyType: "RANGE"}],

            AttributeDefinitions: [
                {AttributeName: "pk", AttributeType: "S"},
                {AttributeName: "sk", AttributeType: "S"}
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
            },
            data: [

            ],
        },
        {
            TableName: "data-management-checklist-search",
            KeySchema: [{AttributeName: "hashKey", KeyType: "HASH"}, {AttributeName: "rangeKey", KeyType: "RANGE"}],
            AttributeDefinitions: [
                {AttributeName: "hashKey", AttributeType: "S"},
                {AttributeName: "rangeKey", AttributeType: "S"}
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1,
            }
        }
    ],
    basePort: 8000,
};
