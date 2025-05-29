# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

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

## Local Deploy
```
pnpm clean && pnpm install && pnpm build
cd deployment 
AWS_PROFILE=dev DEV_DEPLOY_OVERRIDE=true cdk deploy TranscriptionStack
```


