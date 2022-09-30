import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import xray from "aws-xray-sdk";

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
xray.captureAWSv3Client(dynamoDBClient);

export default dynamoDBClient;
