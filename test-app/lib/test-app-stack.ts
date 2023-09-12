import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ddb from "aws-cdk-lib/aws-dynamodb";

export class TestAppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const resourcePrefix = `${this.account}-${this.stackName.toLowerCase()}`;

    new s3.Bucket(this, "MyFirstBucket", {
      bucketName: `${resourcePrefix}-bucket`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new ddb.Table(this, "MyFirstTable", {
      tableName: `${resourcePrefix}-table`,
      partitionKey: { name: "pk", type: ddb.AttributeType.STRING },
      sortKey: { name: "sk", type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
