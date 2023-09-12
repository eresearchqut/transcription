import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";


export interface GitHubStackProps extends cdk.StackProps {
  readonly stacks: string[];
  readonly owner: string;
  readonly repo: string;
  readonly filters?: string[];
}

const appResourcePolicies = (stacks: string[]) => {
  stacks = stacks.map(stack => stack.toLowerCase());
  return [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:*"
      ],
      resources: stacks.map(stack => `arn:aws:s3:::${cdk.Aws.ACCOUNT_ID}-${stack}-*`)
    }),
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "dynamodb:*"
      ],
      resources: stacks.flatMap(stack => [
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*/index/*`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*/stream/*`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*/backup/*`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*/import/*`,
        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cdk.Aws.ACCOUNT_ID}-${stack}-*/export/*`
      ])
    }),
  ];
};

export class GitHubStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GitHubStackProps) {
    super(scope, id, props);
    const filters = props.filters ?? ["*"];

    const provider = new iam.OpenIdConnectProvider(this, "oidc-provider-github", {
      url: `https://token.actions.githubusercontent.com`,
      clientIds: ["sts.amazonaws.com"]
    });

    const principal = new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
      StringLike: {
        [`token.actions.githubusercontent.com:sub`]: filters.map(filter => `repo:${props.owner}/${props.repo}:${filter}`)
      }
    });

    const assetBucket = new s3.Bucket(this, "asset-bucket", {
      bucketName: `${this.account}-${props.owner}-${props.repo}-asset-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const readAccountPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sts:GetCallerIdentity"],
      resources: ["*"]
    });

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
        "sts:GetCallerIdentity",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet"
      ],
      resources: props.stacks.map(stack => `arn:aws:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/${stack}/*`)
    });

    const deployRole = new iam.Role(this, "deploy-role", {
      assumedBy: principal,
      description: "This role is used via GitHub Actions to deploy with AWS CDK on the target AWS account",
      inlinePolicies: {
        "read-account": new iam.PolicyDocument({
          statements: [
            readAccountPolicy,
            cloudformationPolicy,
            ...appResourcePolicies(props.stacks)
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
