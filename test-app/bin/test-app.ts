#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TestAppStack } from "../lib/test-app-stack";
import { GitHubStack } from "../lib/test-app-github-stack";

type Environment = "dev" | "qa" | "prod";

const envs = {
  "dev": { account: "854640616043", region: "ap-southeast-2" },
  "qa": { account: "488710887118", region: "ap-southeast-2" },
  "prod": { account: "827511434808", region: "ap-southeast-2" }
};

const owner = "eresearchqut";
const repo = "transcription";
const stackName = "TestAppStack";
const env = envs[process.env.GITHUB_REF_NAME as Environment] ?? envs["dev"];

const app = new cdk.App();
const githubActionsSynthesizer = new cdk.CliCredentialsStackSynthesizer({
  fileAssetsBucketName: `${env.account}-${owner}-${repo}-asset-bucket`
});

new TestAppStack(app, "TestAppStack", {
  synthesizer: process.env.GITHUB_ACTIONS ? githubActionsSynthesizer : undefined,
  stackName,
  env
});
new GitHubStack(app, "GitHubStack", { owner, repo, stacks: [stackName], env });