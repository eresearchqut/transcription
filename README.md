# Transcription

[eResearch QUT](https://www.qut.edu.au/research/office-of-eresearch) Transcription Service

![upload](images/upload.png)
![transcriptions](images/transcriptions.png)
![player](images/player.png)

This application is monorepo using a pnpm workspace.

* `pnpm build`
* `pnpm install`
* `pnpm test`
* `pnpm test:integration` (needs a running local stack, see below)

## Local frontend development against the deployed dev environment
1. Copy the dev environment variables into your local `.env.local`
```
cd frontend
export STACK_NAME=dev-transcription
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text > .env.local
```
2. Modify `.env.local` to redirect to the local app after login:
```
NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT=http://localhost:3000/
```
3. Start the app against the deployed dev environment
```
pnpm dev:frontend
```

## Running the whole stack locally

The CDK app deploys against [MiniStack](https://ministack.org), a local AWS emulator, so the same `deployment/lib/api-stack.ts` that provisions dev and prod provisions your machine. Nothing is hand-written to mirror the real stack.

Speech-to-text and machine translation are emulated. Transcribe returns a committed fixture transcript and Translate applies a deterministic language-tagged transformation, so neither says anything about transcription or translation quality.

`FrontEndStack` is out of scope. It is CloudFront plus Lambda@Edge in us-east-1; locally the frontend runs under `next dev` against the local API.

### Prerequisites

Docker, with the daemon running and its socket readable, since handlers execute in sibling containers. The AWS CLI, which the helper scripts use to read stack outputs and seed users. Then `pnpm install` at the repo root. No AWS account, credentials or deployed stack are needed, and the scripts supply their own placeholder ones.

### Start it

```
pnpm dev
```

That starts the emulator, deploys both stacks, writes `frontend/.env.local`, seeds two Cognito users and starts the Next server on http://localhost:3000. It takes about a minute from cold.

`/login` shows a username and password form rather than redirecting to the hosted UI, which needs TLS and the QUT identity provider. Sign in as `researcher1` or `researcher2` with the password `password`. A deployed build has no emulator endpoint configured, so the form is left out of the bundle.

### Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm ministack:up` | Start the emulator and deploy, without the frontend |
| `pnpm ministack:logs` | Follow the deploy, which is where CDK errors surface |
| `pnpm ministack:deploy` | Redeploy after changing handler or stack code |
| `pnpm ministack:env` | Rewrite `frontend/.env.local` from the deployed stack outputs |
| `pnpm ministack:seed-users` | Recreate the two Cognito users |
| `pnpm ministack:down` | Stop the emulator and discard its state |

MiniStack holds its state in the container, so stopping it discards the stacks and every id changes on the next start. `frontend/.env.local` then holds a stale user pool client id, which surfaces as `Client ... not found`. `pnpm ministack:env` rewrites it, and `pnpm dev` does so on every start. Adding `-v` also removes the dependency volumes, which only makes the next start slower.

The bootstrap container finishes by running `cdklocal watch`, but a host edit to a bind-mounted file raises no inotify event inside the container on macOS, so code changes need `pnpm ministack:deploy`. That command synthesizes into its own output directory, since the watch process holds `cdk.out` for as long as it runs.

The gateway is published on 24566 rather than the usual 4566, so this stack can run alongside other local emulators. It is published on all interfaces so the app can be opened from a phone or another machine, which means the emulator is reachable by anyone on the same network.

### Opening the app from another device

The stack is deployed against `localhost` by default, and the browser resolves that to whatever device it is running on, so a phone loading `http://<your-machine>:3000` would look for Cognito, S3 and the API on the phone. `LOCAL_HOST` sets the host the browser is given instead:

```
LOCAL_HOST=<your-machine-address> pnpm dev
```

It is read at deploy time and baked into the stack outputs, so changing it redeploys and rewrites `frontend/.env.local`. The helper scripts still reach the emulator on `localhost`, since they run on this machine. Use the address the other device can reach, not `0.0.0.0`.

### Keeping the emulator image current

`docker-compose.yml` runs `ministackorg/ministack:latest`, and Compose reuses the cached copy rather than checking for a newer one. A stale image presents as broken application code, since a service added since the pull is simply absent. Refresh it with `docker compose pull`.

1.5.10 is the floor: earlier releases have no Translate service, and they let any token through the REST API authorizer. `MINISTACK_IMAGE` pins a specific release or points at a locally-built image.

### Summarisation against the local stack

Summarisation calls Bedrock, which MiniStack answers with a canned Anthropic-shaped reply prefixed `[ministack mock`. The shape is right and the content is a digest of the prompt, so the chain can be exercised but the summary itself means nothing.

For real summaries, point MiniStack at any OpenAI-compatible `/chat/completions` endpoint. With [Ollama](https://ollama.com) serving on its default port:

```
MINISTACK_BEDROCK_PROXY_URL=http://host.docker.internal:11434 pnpm ministack:up
```

Give the base URL only; MiniStack appends `/v1/chat/completions`. It is read at startup, so it must be set when the container is created. Recreating the container wipes the emulator's state, so a redeploy follows.

MiniStack falls back to the canned reply silently when the proxy is unreachable, so check for the `[ministack mock` prefix before trusting a summary, and before asserting on one in a test.

### Integration tests against the local stack

`pnpm test` mocks the AWS SDK and needs no Docker, so it never checks that the S3 notification filters, EventBridge rules and IAM grants in `deployment/lib/api-stack.ts` reach the handlers. `pnpm test:integration` covers that against a running local stack:

```
pnpm ministack:up     # wait for the deploy, watch with pnpm ministack:logs
pnpm test:integration
```

It targets whatever stack is already up rather than starting its own. `.github/workflows/integration.yaml` runs it on pull requests touching the API or the CDK app. `api/test/integration/README.md` covers what the suite leaves uncovered.

A freshly deployed stack builds a container for each handler on its first invocation, so the opening test carries that cost. If the suite times out on a stack that has only just come up, run it again before investigating.

## Contributing to MiniStack

Local gaps are usually fixed upstream rather than worked around here. MiniStack is open source at [ministackorg/ministack](https://github.com/ministackorg/ministack), and the Transcribe, Translate and REST API authorizer support this stack depends on all arrived that way.

Work from a personal fork with `upstream` pointing at `ministackorg/ministack`, and follow its conventions rather than this repo's: ruff and pytest, not Biome and Jest, and one file per service under `ministack/services/`. A new service also needs registering in `ministack/app.py`, detection patterns in `ministack/core/router.py`, a fixture in `tests/conftest.py`, a row in its README table and a CHANGELOG entry. Its `CONTRIBUTING.md` carries the full checklist.

Avoid adding a workaround here for emulator behaviour that AWS does not produce.

## Linting and Formatting

### Frontend

```
pnpm --filter frontend lint
pnpm --filter frontend fmt
```

### API

```
cd api
pnpm --filter transcription-api lint
pnpm --filter transcription-api fmt
```

Ignore formatting revisions in `.git-blame-ignore-revs`:

```
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Manual deployment instructions

```
cd api
pnpm install
```

```
cd frontend
pnpm install
mkdir -p out
```

```
cd deployment
npm install
```

### *Optional: Create GitHub deployment stack*

```
export GITHUB_REF_NAME=dev
export GITHUB_FILTERS="environment:dev"
cdk deploy TranscriptionGitHubStack
cdk deploy TranscriptionFrontEndGitHubStack
```

### *Optional: Assume the GitHub role locally*


`~/.aws/config`:

```
[profile qut-dev]
region = ap-southeast-2

[profile qut-dev-github]
role_arn = <TranscriptionGitHubStack.deployRoleArn>
source_profile = qut-dev
region = ap-southeast-2

[profile qut-dev-github-frontend]
role_arn = <TranscriptionFrontEndGitHubStack.deployRoleArn>
source_profile = qut-dev
region = ap-southeast-2
```

Deploy the stacks with the GitHub role:

```
AWS_PROFILE=qut-dev-github cdk deploy TranscriptionStack
AWS_PROFILE=qut-dev-github-frontend cdk deploy TranscriptionFrontEndStack
```

### Deploy base stack

Also builds the lambda functions

```
cdk deploy TranscriptionStack
```

### Build the frontend

```
export STACK_NAME=dev-transcription
aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='FrontEndEnvironment'].OutputValue" --output text > ../frontend/.env.production
```

From the top-level `frontend` directory:

```
pnpm build
```

### Deploy frontend stack

```
cdk deploy FrontEndStack
```