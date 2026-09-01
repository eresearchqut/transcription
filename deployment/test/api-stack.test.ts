import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { ApiStack, type ApiStackProps } from "../lib/api-stack";

const parameters: ApiStackProps["parameters"] = {
  ApiDomainName: "transcription-api.example.com",
  ApplicationName: "Transcription",
  AwsRoute53CloudFrontHostedZoneId: "Z2FDTNDATAQYW2",
  Environment: "dev",
  FrontEndDomainName: "transcription.example.com",
  GlobalCertificateArn:
    "arn:aws:acm:us-east-1:111111111111:certificate/11111111-1111-1111-1111-111111111111",
  GlobalWafArn:
    "arn:aws:wafv2:us-east-1:111111111111:global/webacl/global/11111111-1111-1111-1111-111111111111",
  HostedZoneName: "example.com",
  IdentityProviderLogoutURL: "https://idp.example.com/logout",
  LogBucketSuffix: "logs",
  RegionalCertificateArn:
    "arn:aws:acm:ap-southeast-2:111111111111:certificate/22222222-2222-2222-2222-222222222222",
  RegionalWafArn:
    "arn:aws:wafv2:ap-southeast-2:111111111111:regional/webacl/regional/22222222-2222-2222-2222-222222222222",
  SubnetIds: ["subnet-11111111", "subnet-22222222", "subnet-33333333"],
  SupportedIdentityProviders: ["COGNITO"],
  UserPoolStackName: "dev-user-pool",
  VpcId: "vpc-11111111",
};

const env = { account: "111111111111", region: "ap-southeast-2" };

const synthesise = (props?: Partial<ApiStackProps>): Template => {
  const app = new cdk.App();
  const stack = new ApiStack(app, "TranscriptionStack", {
    stackName: "dev-transcription",
    parameters,
    env,
    ...props,
  });
  return Template.fromStack(stack);
};

describe("ApiStack", () => {
  describe("under a real deploy", () => {
    const template = () => synthesise();

    it("puts the api function in a vpc", () => {
      template().resourceCountIs("AWS::EC2::SecurityGroup", 1);
      template().hasResourceProperties("AWS::Lambda::Function", {
        VpcConfig: Match.objectLike({
          SubnetIds: parameters.SubnetIds,
        }),
      });
    });

    it("associates a web acl", () => {
      template().hasResourceProperties("AWS::WAFv2::WebACLAssociation", {
        WebACLArn: parameters.RegionalWafArn,
      });
    });

    it("creates a custom domain and alias record", () => {
      template().hasResourceProperties("AWS::ApiGateway::DomainName", {
        DomainName: parameters.ApiDomainName,
        RegionalCertificateArn: parameters.RegionalCertificateArn,
      });
      template().resourceCountIs("AWS::ApiGateway::BasePathMapping", 1);
      template().hasResourceProperties("AWS::Route53::RecordSet", {
        Name: `${parameters.ApiDomainName}.`,
        Type: "A",
      });
    });

    it("leaves the x-ray daemon address at the lambda default", () => {
      Object.values(template().findResources("AWS::Lambda::Function")).forEach(
        (fn) => {
          expect(fn.Properties.Environment?.Variables ?? {}).not.toHaveProperty(
            "AWS_XRAY_CONTEXT_MISSING",
          );
        },
      );
    });
  });

  describe("under local deploy", () => {
    const localTemplate = () => synthesise({ localDeploy: true });

    it("does not put the api function in a vpc", () => {
      localTemplate().resourceCountIs("AWS::EC2::SecurityGroup", 0);
      localTemplate().hasResourceProperties("AWS::Lambda::Function", {
        VpcConfig: Match.absent(),
      });
    });

    it("does not associate a web acl", () => {
      localTemplate().resourceCountIs("AWS::WAFv2::WebACLAssociation", 0);
    });

    it("does not create a custom domain or alias record", () => {
      localTemplate().resourceCountIs("AWS::ApiGateway::DomainName", 0);
      localTemplate().resourceCountIs("AWS::ApiGateway::BasePathMapping", 0);
      localTemplate().resourceCountIs("AWS::Route53::RecordSet", 0);
    });

    it("tolerates a missing x-ray daemon in the application functions", () => {
      const applicationFunctions = Object.values(
        localTemplate().findResources("AWS::Lambda::Function"),
      ).filter((fn) => fn.Properties.Environment?.Variables?.APPLICATION_NAME);
      expect(applicationFunctions).toHaveLength(7);
      applicationFunctions.forEach((fn) => {
        expect(fn.Properties.Environment.Variables).toMatchObject({
          AWS_XRAY_CONTEXT_MISSING: "LOG_ERROR",
        });
      });
    });
  });
});
