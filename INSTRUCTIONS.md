# Instructions

The transcription service is designed to be deployed in QUT's AWS environment, using the [AWS Serverless Application Model (SAM) framework](https://aws.amazon.com/serverless/sam/).

To deploy it in your own environment, you will need the following:

1. A Cognito UserPool linked to your own Identity Provider
   1. The service assumes this can be accessed through a CloudFormation stack with the following outputs:
      1. `UserPoolArn`
      2. `UserPoolId`
      3. `UserPoolProviderName`
      4. `DomainName`
2. A Route53 hosted zone
3. A Web Application Firewall to wrap the CloudFront and API Gateway services
4. A VPC

Once you have the above, you can configure your own [SAM CLI config file](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html) based on QUT's [samconfig.toml](samconfig.toml) 

