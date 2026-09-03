#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { FrontEndStack } from "../lib/front-end-stack";
import { GitHubStack } from "../lib/github-stack";
import { LocalUserPoolStack } from "../lib/local-user-pool-stack";

const devDeployOverride = process.env.DEV_DEPLOY_OVERRIDE;
const GIT_CURRENT_BRANCH_COMMAND = "git rev-parse --abbrev-ref HEAD";
type Environment = "dev" | "qa" | "prod" | "local";

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
    SplunkRumAccessToken?: string;
    SubnetIds: string[];
    SupportedIdentityProviders: string[];
    UserPoolStackName: string;
    UmamiWebsiteId?: string;
    UmamiUrl?: string;
    VpcId: string;
  };
}

const owner = "eresearchqut";
const repo = "transcription";

/**
 * Deploy against a local AWS emulator (MiniStack) instead of real AWS. Set
 * explicitly rather than derived from the branch name so that a local deploy is
 * never triggered by accident.
 */
const isLocalDeploy: boolean = process.env.LOCAL_DEPLOY
  ? JSON.parse(process.env.LOCAL_DEPLOY)
  : false;

/**
 * The local emulator endpoint. Only present in the local configuration, since
 * real deployments address AWS directly.
 */
interface LocalEnvironmentConfig extends EnvironmentConfig {
  endpoint: string;
}

const readLocalEnvironmentConfig = (): LocalEnvironmentConfig =>
  JSON.parse(
    readFileSync(resolve(__dirname, "../config/local.json"), {
      encoding: "utf8",
    }),
  );

const githubFilters = process.env.GITHUB_FILTERS
  ? process.env.GITHUB_FILTERS.split(",")
  : undefined;
const isDevDeploy: boolean = devDeployOverride
  ? JSON.parse(devDeployOverride)
  : false;
const currentBranch = isLocalDeploy
  ? undefined
  : execSync(GIT_CURRENT_BRANCH_COMMAND).toString("utf8").trim();
const envName: Environment = isLocalDeploy
  ? "local"
  : isDevDeploy
    ? "dev"
    : ((currentBranch ?? "dev") as Environment);

const apiStackName = `${envName}-${repo}`;
const frontendStackName = `${envName}-${repo}-frontend`;

const app = new cdk.App({});

if (isLocalDeploy) {
  const env = readLocalEnvironmentConfig();

  // ApiStack imports the user pool from an externally managed stack, which has
  // no local counterpart, so stand one up under the same exported names.
  const userPoolStack = new LocalUserPoolStack(
    app,
    "TranscriptionUserPoolStack",
    {
      stackName: env.parameters.UserPoolStackName,
      exportPrefix: env.parameters.UserPoolStackName,
      hostedUiDomain: new URL(env.endpoint).host,
      env: { account: env.account, region: env.region },
    },
  );

  // The default synthesizer uses the bootstrapped asset bucket, so no real
  // file-assets bucket is required. The GitHub stacks and the us-east-1
  // FrontEndStack are deliberately not created locally.
  const apiStack = new ApiStack(app, "TranscriptionStack", {
    stackName: apiStackName,
    localDeploy: true,
    parameters: env.parameters,
    env: { account: env.account, region: env.region },
  });
  apiStack.addDependency(userPoolStack);

  [apiStack, userPoolStack].forEach((stack) => {
    cdk.Tags.of(stack).add("EresCdkApp", repo);
  });
} else {
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
      const frontEndStack = new FrontEndStack(
        app,
        "TranscriptionFrontEndStack",
        {
          stackName: frontendStackName,
          synthesizer: new cdk.CliCredentialsStackSynthesizer({
            fileAssetsBucketName: `${env.account}-us-east-1-${owner}-${repo}`,
          }),
          parameters: env.parameters,
          env: { account: env.account, region: "us-east-1" },
        },
      );

      [apiStack, apiGitHubStack, frontEndStack, frontEndGitHubStack].forEach(
        (stack) => {
          cdk.Tags.of(stack).add("EresCdkApp", repo);
        },
      );
    });
}
