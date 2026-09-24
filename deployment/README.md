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

Setting `LOCAL_DEPLOY=true` makes `bin/deployment.ts` deploy to MiniStack instead of AWS. You rarely run it yourself: `docker compose up` deploys inside the bootstrap container with the switch already set. See the local development section of the root README.

A local deploy differs from a deployed environment in these ways.

**It reads a file, not SSM.** Parameters come from `config/local.json` rather than `/app/<env>/transcription/env`, because the emulator starts empty and would have to be given the parameter before it could read it, on every start.

**It leaves several parameters blank.** `ApiDomainName`, `HostedZoneName`, `RegionalCertificateArn`, `RegionalWafArn` and `VpcId` are empty, and `ApiStack` skips the custom domain, DNS record, WAF and VPC that depend on them. Blank is only acceptable locally, so a deployed environment fails the synth instead, in `assertDeployedParameters`.

**It builds a different set of stacks.** `TranscriptionUserPoolStack` is added, because a deployed environment is handed a user pool managed outside this app and the local one has to stand up an equivalent under the same export names. The GitHub stacks and the us-east-1 `FrontEndStack` are skipped, having no local counterpart. The default CDK synthesizer is kept, so no real asset bucket is needed.

**`ApiStack` takes its emulator branch.** The differences are resolved at the top of the constructor from `props.emulator`, so the rest of the stack reads AWS-first:

* S3 is addressed path-style, because the emulator has no wildcard DNS for `<bucket>.<host>`.
* An aspect tolerates the missing X-Ray daemon.
* The REST API id is pinned, so the execute-api URL survives a redeploy and `frontend/.env.local` stays valid.
* The Cognito callback URL and allowed origin use `http`, because `next dev` serves the frontend over plain HTTP.
* The frontend is given the emulator endpoint, which the AWS SDK otherwise ignores in favour of real AWS.

Sign-in goes through the Cognito hosted UI in both cases. A deployed pool federates to QUT SSO, so the hosted UI redirects there. The local pool has no federation, so the hosted UI shows its own username and password form. Amplify hardcodes `https` into the hosted UI URL, so Compose runs a TLS proxy in front of the gateway to provide it.

### Addressing from the browser

`config/local.json` writes browser-facing hosts as `{{LOCAL_HOST}}`, which `bin/deployment.ts` replaces with the `LOCAL_HOST` environment variable, defaulting to `localhost`. It covers the emulator endpoint and the frontend origin. Set it to this machine's network address to open the app from another device, where `localhost` means that device instead.

`authDomain` is deliberately not substituted: the proxy's certificate is issued for `localhost` and is valid nowhere else. Neither is the endpoint the deploy and the handlers use, which stays on the Compose network.
