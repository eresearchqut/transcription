const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const region = process.env.AWS_REGION || "ap-southeast-2";
const dynamoDbClientConfig = {
  region,
  ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
    endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
    sslEnabled: false,
    region: "local",
  }),
};
const dynamoDBClient = new DynamoDBClient(dynamoDbClientConfig);

module.exports = dynamoDBClient;
