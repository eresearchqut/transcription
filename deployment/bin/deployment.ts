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
  /**
   * Only a local deploy sets this, carrying the browser-reachable address of
   * the emulator gateway. Real environments address AWS directly.
   */
  endpoint?: string;
  /**
   * Only a local deploy sets this, carrying the host serving the Cognito
   * hosted UI over TLS. Not subject to `LOCAL_HOST` substitution: the
   * certificate is issued for `localhost`, so another device on the network
   * cannot use it.
   */
  authDomain?: string;
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
 * explicitly, so a local deploy is never triggered by accident.
 */
const isLocalDeploy: boolean = process.env.LOCAL_DEPLOY
  ? JSON.parse(process.env.LOCAL_DEPLOY)
  : false;

/**
 * The host the browser reaches the emulator and the frontend on. Only the
 * browser resolves it, so opening the app from another device needs that
 * machine's address. The deploy and the handlers stay on the Compose network.
 */
const localHost = process.env.LOCAL_HOST ?? "localhost";

// Doubled braces, since ${...} would read as a variable expanded elsewhere.
const LOCAL_HOST_PLACEHOLDER = "{{LOCAL_HOST}}";

/**
 * A file rather than SSM. The emulator starts empty, so a local deploy would
 * have to write the parameter before it could read it, on every start.
 */
const readLocalEnvironmentConfig = (): EnvironmentConfig =>
  JSON.parse(
    readFileSync(resolve(__dirname, "../config/local.json"), {
      encoding: "utf8",
    }).replaceAll(LOCAL_HOST_PLACEHOLDER, localHost),
  );

/**
 * Parameters whose absence makes ApiStack skip the resource that depends on
 * them. Empty is meaningful only for a local deploy, which has no VPC, custom
 * domain, WAF or hosted zone. In a real environment an empty value means the
 * SSM parameter is incomplete, so fail rather than deploy without it.
 */
const REQUIRED_DEPLOYED_PARAMETERS = [
  "ApiDomainName",
  "HostedZoneName",
  "RegionalCertificateArn",
  "RegionalWafArn",
  "VpcId",
] as const;

const assertDeployedParameters = (
  envName: Environment,
  parameters: EnvironmentConfig["parameters"],
): void => {
  const missing = REQUIRED_DEPLOYED_PARAMETERS.filter(
    (name) => !parameters[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")} in /app/${envName}/${repo}/env. These are only optional for a local deploy; leaving them empty here would skip the VPC, custom domain, WAF or DNS record.`,
    );
  }
};

const requireEndpoint = ({ endpoint }: EnvironmentConfig): string => {
  if (!endpoint) {
    throw new Error(
      "Missing endpoint in deployment/config/local.json. A local deploy targets the emulator rather than AWS, so there is nothing to address without it.",
    );
  }
  return endpoint;
};

const requireAuthDomain = ({ authDomain }: EnvironmentConfig): string => {
  if (!authDomain) {
    throw new Error(
      "Missing authDomain in deployment/config/local.json. Amplify builds the hosted UI URLs from it, so sign-in has nowhere to go without it.",
    );
  }
  return authDomain;
};

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

/**
 * A local deploy reads a file; every other environment reads SSM.
 */
const loadEnvironment = async (): Promise<EnvironmentConfig> => {
  if (isLocalDeploy) {
    return readLocalEnvironmentConfig();
  }
  const { Parameter } = await new SSMClient().send(
    new GetParameterCommand({ Name: `/app/${envName}/${repo}/env` }),
  );
  const env: EnvironmentConfig = JSON.parse(Parameter?.Value ?? "{}");
  assertDeployedParameters(envName, env.parameters);
  return env;
};

loadEnvironment().then((env) => {
  const apiStack = new ApiStack(app, "TranscriptionStack", {
    stackName: apiStackName,
    parameters: env.parameters,
    env: { account: env.account, region: env.region },
    // A local deploy keeps the default synthesizer, which uses the bootstrapped
    // asset bucket, so no real file-assets bucket is required.
    ...(isLocalDeploy
      ? { emulator: { endpoint: requireEndpoint(env) } }
      : {
          synthesizer: new cdk.CliCredentialsStackSynthesizer({
            fileAssetsBucketName: `${env.account}-${env.region}-${owner}-${repo}`,
          }),
        }),
  });

  const stacks: cdk.Stack[] = [apiStack];

  if (isLocalDeploy) {
    // ApiStack imports the user pool from an externally managed stack, which
    // has no local counterpart, so stand one up under the same exported names.
    const userPoolStack = new LocalUserPoolStack(
      app,
      "TranscriptionUserPoolStack",
      {
        stackName: env.parameters.UserPoolStackName,
        exportPrefix: env.parameters.UserPoolStackName,
        hostedUiDomain: requireAuthDomain(env),
        env: { account: env.account, region: env.region },
      },
    );
    apiStack.addDependency(userPoolStack);
    stacks.push(userPoolStack);
  } else {
    // The GitHub stacks and the us-east-1 FrontEndStack have no local
    // counterpart, so they are only created for a real deploy.
    stacks.push(
      new GitHubStack(app, "TranscriptionGitHubStack", {
        envName,
        owner,
        repo,
        stacks: [apiStackName],
        filters: githubFilters,
        env: { account: env.account, region: env.region },
      }),
      new GitHubStack(app, "TranscriptionFrontEndGitHubStack", {
        envName,
        owner,
        repo,
        stacks: [frontendStackName],
        filters: githubFilters,
        env: { account: env.account, region: "us-east-1" },
      }),
      new FrontEndStack(app, "TranscriptionFrontEndStack", {
        stackName: frontendStackName,
        synthesizer: new cdk.CliCredentialsStackSynthesizer({
          fileAssetsBucketName: `${env.account}-us-east-1-${owner}-${repo}`,
        }),
        parameters: env.parameters,
        env: { account: env.account, region: "us-east-1" },
      }),
    );
  }

  stacks.forEach((stack) => {
    cdk.Tags.of(stack).add("EresCdkApp", repo);
  });
});
