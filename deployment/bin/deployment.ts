#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { GitHubStack } from "../lib/github-stack";
import { FrontEndStack } from "../lib/front-end-stack";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { execSync } from "child_process";

const devDeployOverride = process.env.DEV_DEPLOY_OVERRIDE;
const GIT_CURRENT_BRANCH_COMMAND = "git rev-parse --abbrev-ref HEAD";
type Environment = "dev" | "qa" | "prod";

interface EnvironmentConfig {
  account: string;
  region: string;
  parameters: {
    ApiDomainName: string;
    ApplicationName: string;
    AwsRoute53CloudFrontHostedZoneId: string;
    Environment: Environment;
    FrontEndDomainName: string;
    GlobalCertificateArn: string;
    GlobalWafArn: string;
    HostedZoneName: string;
    IdentityProviderLogoutURL: string;
    LogBucketSuffix: string;
    RegionalCertificateArn: string;
    RegionalWafArn: string;
    SplunkRumAccessToken: string;
    SubnetIds: string[];
    SupportedIdentityProviders: string[];
    UserPoolStackName: string;
    UmamiWebsiteId: string;
    UmamiUrl: string;
    VpcId: string;
  };
}

const owner = "eresearchqut";
const repo = "transcription";

const githubFilters = process.env.GITHUB_FILTERS
  ? process.env.GITHUB_FILTERS.split(",")
  : undefined;
const isDevDeploy: boolean = devDeployOverride
  ? JSON.parse(devDeployOverride)
  : false;
const currentBranch = execSync(GIT_CURRENT_BRANCH_COMMAND)
  .toString("utf8")
  .trim();
const envName = isDevDeploy ? "dev" : ((currentBranch ?? "dev") as Environment);

const apiStackName = `${envName}-${repo}`;
const frontendStackName = `${envName}-${repo}-frontend`;

const app = new cdk.App({});

new SSMClient()
  .send(new GetParameterCommand({ Name: `/app/${envName}/${repo}/env` }))
  .then(({ Parameter }) => JSON.parse(Parameter?.Value ?? "{}"))
  .then((env: EnvironmentConfig) => {
    const apiGitHubStack = new GitHubStack(app, "TranscriptionGitHubStack", {
      envName,
      owner,
      repo,
      stacks: [apiStackName],
      filters: githubFilters,
      env: { account: env.account, region: env.region },
    });
    const frontEndGitHubStack = new GitHubStack(
      app,
      "TranscriptionFrontEndGitHubStack",
      {
        envName,
        owner,
        repo,
        stacks: [frontendStackName],
        filters: githubFilters,
        env: { account: env.account, region: "us-east-1" },
      },
    );

    const apiStack = new ApiStack(app, "TranscriptionStack", {
      stackName: apiStackName,
      synthesizer: new cdk.CliCredentialsStackSynthesizer({
        fileAssetsBucketName: `${env.account}-${env.region}-${owner}-${repo}`,
      }),
      parameters: env.parameters,
      env: { account: env.account, region: env.region },
    });
    const frontEndStack = new FrontEndStack(app, "TranscriptionFrontEndStack", {
      stackName: frontendStackName,
      synthesizer: new cdk.CliCredentialsStackSynthesizer({
        fileAssetsBucketName: `${env.account}-us-east-1-${owner}-${repo}`,
      }),
      parameters: env.parameters,
      env: { account: env.account, region: "us-east-1" },
    });

    [apiStack, apiGitHubStack, frontEndStack, frontEndGitHubStack].forEach(
      (stack) => cdk.Tags.of(stack).add("EresCdkApp", repo),
    );
  });
