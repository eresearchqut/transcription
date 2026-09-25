# Transcription CDK app

`bin/deployment.ts` picks an environment, loads its parameters and creates the stacks. `cdk.json` runs it through ts-node, so a deploy needs no compile step here. Workspace packages the handlers import still need `pnpm build` at the repo root.

## Commands

Run these from `deployment/`:

- `pnpm test` runs the Jest tests for the stacks.
- `pnpm build` compiles the app with tsc, and `pnpm watch` recompiles on change.
- `pnpm cdk synth`, `pnpm cdk diff` and `pnpm cdk deploy` run the CDK CLI installed with this package.

## Environments

The environment is the current git branch: `dev`, `qa` or `prod`. Its parameters, including the account and region to deploy to, are read from SSM at `/app/<env>/transcription/env`. On any other branch the lookup fails, so set `DEV_DEPLOY_OVERRIDE=true` to use `dev`. `LOCAL_DEPLOY=true` targets the local emulator instead, described below.

## Stacks

| Stack | Contents | Created for |
| --- | --- | --- |
| `TranscriptionStack` | The API, the Lambda handlers, the DynamoDB table, the data bucket and the EventBridge rules, in `lib/api-stack.ts` | Every environment |
| `TranscriptionFrontEndStack` | The S3 bucket and CloudFront distribution serving `frontend/out`, in us-east-1 | Deployed environments |
| `TranscriptionGitHubStack`, `TranscriptionFrontEndGitHubStack` | The asset bucket and the role GitHub Actions assumes to deploy each of the two stacks above | Deployed environments |
| `TranscriptionUserPoolStack` | A Cognito user pool standing in for the externally managed one | Local deploys |

## Deploying to dev from your machine

```sh
pnpm clean && pnpm install && pnpm build
cd deployment
AWS_PROFILE=dev DEV_DEPLOY_OVERRIDE=true pnpm cdk deploy TranscriptionStack
```

`TranscriptionFrontEndStack` uploads `frontend/out`, so build the frontend against the `FrontEndEnvironment` output of `TranscriptionStack` before deploying it. The root README's manual deployment section has those steps. `.github/workflows/deploy.yaml` runs the same sequence after a successful build on `dev`, `qa` or `prod`.

## Deploying against the local emulator

`LOCAL_DEPLOY=true` makes `bin/deployment.ts` deploy to MiniStack instead of AWS. You rarely set it yourself, because `docker compose up` deploys from the bootstrap container with it already set. See the local development section of the root README.

A local deploy differs from a deployed environment in four ways.

**Parameters come from a file.** `config/local.json` replaces the SSM parameter, because the emulator starts empty and would need the parameter written on every start before it could be read.

**Some parameters are blank.** `ApiDomainName`, `HostedZoneName`, `RegionalCertificateArn`, `RegionalWafArn` and `VpcId` are empty, and `ApiStack` skips the custom domain, DNS record, WAF and VPC that use them. A deployed environment with any of them blank fails the synth in `assertDeployedParameters`.

**The stacks differ.** `TranscriptionUserPoolStack` is added under the export names the externally managed pool uses. The GitHub stacks and `TranscriptionFrontEndStack` are skipped, having no local counterpart. The asset bucket those GitHub stacks would create is made by the Compose bootstrap command instead.

**`ApiStack` adjusts for the emulator.** Each difference is resolved from `props.emulator` at the top of the constructor, so the rest of the stack reads as the AWS version:

- Handlers address S3 path-style, because the emulator has no wildcard DNS for `<bucket>.<host>`.
- An aspect tolerates the missing X-Ray daemon.
- The REST API id is pinned, so the execute-api URL survives a redeploy and `frontend/.env.development.local` stays valid.
- The Cognito callback URL and allowed origin use `http`, because `next dev` serves the frontend over plain HTTP.
- The frontend is given the emulator endpoint, which `frontend/pages/_app.tsx` points Amplify Storage at.

Sign-in goes through the Cognito hosted UI in both cases. A deployed pool federates to QUT SSO, so the hosted UI redirects there. The local pool has no federation and shows its own username and password form. Amplify hardcodes `https` into the hosted UI URL, so Compose runs a TLS proxy in front of the gateway for it.
