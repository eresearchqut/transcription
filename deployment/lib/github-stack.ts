import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";


export interface GitHubStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly stacks: string[];
  readonly owner: string;
  readonly repo: string;
  readonly filters?: string[];
}

const appResourcePolicies = (tagKey: string, tagValue: string, stacks: string[]) => stacks.map(stack => stack.toLowerCase()).flatMap((stack) => [
  new iam.PolicyStatement({
    actions: [
      "s3:*",
      "dynamodb:*",
      "lambda:*",
      "cloudfront:*",
      "apigateway:*",
      "cognito-idp:*",
      "cognito-identity:*",
      "ec2:CreateSecurityGroup",
      "ec2:DescribeSecurityGroups",
      "ec2:DeleteSecurityGroup",
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:AuthorizeSecurityGroupEgress",
      "ec2:RevokeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupEgress",
      "iam:*",
      "events:*",
      "route53:*",
      "wafv2:*"
    ],
    resources: ["*"]
  })
]);

export class GitHubStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GitHubStackProps) {
    super(scope, id, props);
    const filters = props.filters ?? ["*"];

    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, "oidc-provider-github", `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`);

    const principal = new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
      StringLike: {
        "token.actions.githubusercontent.com:sub": filters.map(filter => `repo:${props.owner}/${props.repo}:${filter}`)
      }
    });

    const assetBucket = new s3.Bucket(this, "asset-bucket", {
      bucketName: `${this.account}-${this.region}-${props.owner}-${props.repo}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // To read the account id
    const readAccountPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sts:GetCallerIdentity"],
      resources: ["*"]
    });

    // To create the cdk.context.json file
    const cdkPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeRouteTables",
        "ec2:DescribeVpcs",
        "ec2:DescribeVpnGateways",
        "ec2:DescribeSubnets"
      ],
      resources: ["*"]
    });

    // To manage the stacks
    const cloudformationPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cloudformation:UpdateTerminationProtection",
        "cloudformation:CreateChangeSet",
        "cloudformation:DeleteChangeSet",
        "cloudformation:GetTemplateSummary",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:CreateStack",
        "cloudformation:GetTemplate",
        "cloudformation:DeleteStack",
        "cloudformation:UpdateStack",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "sts:GetCallerIdentity"
      ],
      resources: props.stacks.map(stack => `arn:aws:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/${stack}/*`)
    });

    // To read the config
    const ssmPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["ssm:GetParameter"],
      resources: [`arn:aws:ssm:*:${cdk.Aws.ACCOUNT_ID}:parameter/app/${props.envName}/${props.repo}/env`]
    });

    const deployRole = new iam.Role(this, "deploy-role", {
      assumedBy: new iam.CompositePrincipal(principal, new iam.AccountPrincipal(cdk.Aws.ACCOUNT_ID)),
      description: "This role is used via GitHub Actions to deploy with AWS CDK on the target AWS account",
      inlinePolicies: {
        "read-account": new iam.PolicyDocument({
          statements: [
            readAccountPolicy,
            cloudformationPolicy,
            cdkPolicy,
            ssmPolicy,
            ...appResourcePolicies("EresCdkApp", "transcription", props.stacks)
          ]
        })
      },
      maxSessionDuration: cdk.Duration.hours(1)
    });

    assetBucket.grantReadWrite(deployRole);

    new cdk.CfnOutput(this, "deployRoleArn", {
      value: deployRole.roleArn,
      description: "The role used via GitHub Actions to deploy with AWS CDK on the target AWS account",
      exportName: "deployRoleArn"
    });
  }
}
