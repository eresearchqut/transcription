# Transcription CDK app

The `cdk.json` file tells the CDK Toolkit how to execute this app.

`bin/deployment.ts` picks an environment, reads its parameters and instantiates the stacks. A deployed environment reads its parameters from SSM under `/app/<env>/transcription/env`; a local deploy reads `config/local.json` instead.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Deployment options
* `AWS_PROFILE=dev cdk deploy`               deploy this stack to your default AWS account/region and a specified profile
* `DEV_DEPLOY_OVERRIDE=true cdk deploy`      deploy this stack using the dev environment settings regardless of your current git branch

## Deploying dev settings from your machine

Deploys to real AWS using the dev environment's parameters, whatever branch you are on.

```
pnpm clean && pnpm install && pnpm build
cd deployment 
AWS_PROFILE=dev DEV_DEPLOY_OVERRIDE=true cdk deploy TranscriptionStack
```

## Deploying against the local emulator

`LOCAL_DEPLOY=true` targets MiniStack instead of AWS. It is read explicitly rather than derived from the branch name, so a local deploy is never triggered by accident, and it changes three things: the environment becomes `local` and reads `config/local.json`, the default synthesizer replaces the CDK's bootstrapped one, and `ApiStack` takes its emulator branch.

You rarely run this by hand. `docker compose up` runs `cdklocal bootstrap && cdklocal deploy && cdklocal watch` inside the bootstrap container with the switch already set, so a handler change redeploys itself. See the local development section of the root README.

`TranscriptionUserPoolStack` exists only locally. A deployed environment is handed a user pool that already exists, provisioned outside this app, so the local stack stands one up and exports the values `ApiStack` imports.

Everything that differs under the emulator is resolved in one block at the top of the `ApiStack` constructor, keyed off `props.emulator`, so the rest of the stack reads AWS-first. Two are emulator gaps: path-style S3 addressing, since there is no wildcard DNS, and an aspect that tolerates the missing X-Ray daemon. A third pins the REST API id so the execute-api URL survives a rebuilt stack. The rest follow from having no TLS locally, which rules out the hosted UI and the custom domain.

The VPC, custom domain, WAF and DNS record are separate, driven by their parameters being empty in `config/local.json`. Those same parameters are required in a deployed environment, so an incomplete SSM parameter set fails the synth rather than quietly deploying an API with no WAF in front of it.

