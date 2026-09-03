import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  CUSTOM_ATTRIBUTES,
  LocalUserPoolStack,
} from "../lib/local-user-pool-stack";

const exportPrefix = "local-transcription-user-pool";

const synthesise = (): Template => {
  const app = new cdk.App();
  const stack = new LocalUserPoolStack(app, "TranscriptionUserPoolStack", {
    stackName: exportPrefix,
    exportPrefix,
    hostedUiDomain: "localhost:24566",
    env: { account: "000000000000", region: "ap-southeast-2" },
  });
  return Template.fromStack(stack);
};

describe("LocalUserPoolStack", () => {
  it("exports the values ApiStack imports", () => {
    const template = synthesise();
    template.hasOutput("UserPoolArn", {
      Export: { Name: `${exportPrefix}-UserPoolArn` },
      Value: { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
    });
    template.hasOutput("UserPoolProviderName", {
      Export: { Name: `${exportPrefix}-UserPoolProviderName` },
      Value: { "Fn::GetAtt": [Match.anyValue(), "ProviderName"] },
    });
    template.hasOutput("DomainName", {
      Export: { Name: `${exportPrefix}-DomainName` },
      Value: "localhost:24566",
    });
  });

  it("declares the custom attributes the application reads", () => {
    synthesise().hasResourceProperties("AWS::Cognito::UserPool", {
      Schema: Match.arrayWith(
        CUSTOM_ATTRIBUTES.map((Name) =>
          Match.objectLike({ Name, AttributeDataType: "String" }),
        ),
      ),
    });
  });

  it("creates a hosted ui domain for the pool", () => {
    synthesise().hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      Domain: exportPrefix,
    });
  });

  it("leaves nothing behind when destroyed", () => {
    synthesise().hasResource("AWS::Cognito::UserPool", {
      DeletionPolicy: "Delete",
    });
  });
});
