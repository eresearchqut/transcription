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

The CDK app deploys against [MiniStack](https://ministack.org), a local AWS emulator, so the same `deployment/lib/api-stack.ts` that provisions dev and prod provisions your laptop. Nothing is hand-written to mirror the real stack, which is the point: a resource that only exists in the deployed environment cannot drift out of the local one.

Speech-to-text and machine translation are emulated rather than real. Transcribe returns a committed fixture transcript and Translate applies a deterministic language-tagged transformation, so runs are fast and tests are repeatable. Neither says anything about transcription or translation quality.

`FrontEndStack` is out of scope. It is CloudFront plus Lambda@Edge in us-east-1; locally the frontend runs under `next dev` against the local API.

### Prerequisites

Docker, with the daemon running and its socket readable, since handlers execute in sibling containers. Then `pnpm install` at the repo root. Nothing else: no AWS account, no credentials, no deployed stack.

### Start it

```
pnpm dev
```

That starts the emulator, deploys both stacks, writes `frontend/.env.local`, seeds two Cognito users, and starts the Next server on http://localhost:3000. It takes about a minute from cold, most of it the first CDK deploy, and the environment step blocks until the deploy finishes rather than racing it.

Log in puts a username and password form on `/login` rather than redirecting to the hosted UI, which needs TLS and the QUT identity provider. Sign in as `researcher1` or `researcher2` with the password `password`. The seeded accounts guard nothing and are recreated whenever the stack is. A deployed build has no emulator endpoint configured, so the form and its component are left out of the bundle.

### Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm ministack:up` | Start the emulator and deploy, without the frontend |
| `pnpm ministack:logs` | Follow the deploy, which is where CDK errors surface |
| `pnpm ministack:deploy` | Redeploy after changing handler or stack code |
| `pnpm ministack:env` | Rewrite `frontend/.env.local` from the deployed stack outputs |
| `pnpm ministack:seed-users` | Recreate the two Cognito users |
| `pnpm ministack:down` | Stop the stack, keeping its state |

`docker compose down -v` discards the emulator's state, so the next start redeploys from scratch and every id changes. When that happens, `frontend/.env.local` still holds the previous user pool client id, and the failure surfaces as `Client ... not found` rather than anything pointing at the env file. `pnpm ministack:env` rewrites it, and `pnpm dev` does so on every start.

The bootstrap container finishes by running `cdklocal watch`, but a host edit to a bind-mounted file does not raise an inotify event inside the container on macOS, so the watch does not fire and code changes need `pnpm ministack:deploy`. That command synthesizes into its own output directory, since the watch process holds `cdk.out` for as long as it runs.

The gateway is published on 24566 rather than the usual 4566, so this stack, data-management-checklist and spaces can run at once.

### Keeping the emulator image current

`docker-compose.yml` runs `ministackorg/ministack:latest`, but Compose reuses whatever copy is already cached rather than checking for a newer one, so `latest` goes stale without any sign that it has. A months-old image presents as broken application code, since a service added since the pull is simply absent. Refresh it with `docker compose pull` when something that should work does not.

1.5.10 is the floor: earlier releases have no Translate service, and they let any token through the REST API authorizer, including a forged one. `MINISTACK_IMAGE` pins a specific release or points at a locally-built image.

### Summarisation against the local stack

Summarisation calls Bedrock, which MiniStack answers with a canned
Anthropic-shaped reply. Nothing needs installing: an upload with "generate
summary" enabled produces a summary object, and its text reads

```
[ministack mock anthropic anthropic.claude-3-haiku-20240307-v1:0] reply for prompt#23d42284
```

The shape is right and the content is a digest of the prompt, so the chain can
be exercised but the summary itself means nothing. That is usually what you
want locally.

For real summaries, point MiniStack at any OpenAI-compatible
`/chat/completions` endpoint. With [Ollama](https://ollama.com) serving on its
default port:

```
MINISTACK_BEDROCK_PROXY_URL=http://host.docker.internal:11434 pnpm ministack:up
```

Give the base URL only; MiniStack appends `/v1/chat/completions`. The variable
is read at startup, so it must be set when the container is created rather than
exported later. Recreating the container wipes the emulator's state, so a
redeploy follows.

Be aware that MiniStack falls back to the canned reply **silently** when the
proxy is unreachable. A stopped or misaddressed proxy looks like a working run
with placeholder text, not an error. Check for the `[ministack mock` prefix
before trusting a summary, and before asserting on one in a test.

### Integration tests against the local stack

`pnpm test` mocks the AWS SDK throughout and needs no Docker. It therefore
never checks that the S3 notification filters, EventBridge rules and IAM grants
in `deployment/lib/api-stack.ts` reach the handlers.

`pnpm test:integration` covers that. It uploads to the running local stack and
follows the chain to a stored transcript, summary and translation. Start the
stack first:

```
pnpm ministack:up     # wait for the deploy, watch with pnpm ministack:logs
pnpm test:integration
```

It targets whatever stack is already up rather than starting its own. CI starts one for it: `.github/workflows/integration.yaml` runs the suite on pull requests touching the API or the CDK app. `api/test/integration/README.md` covers what the suite deliberately leaves uncovered.

A freshly deployed stack builds a container for each handler on its first invocation, so the opening test carries that cost. If the suite times out on a stack that has only just come up, run it again before investigating.

## Contributing to MiniStack

Local gaps are usually fixed upstream rather than worked around here. MiniStack is open source at [ministackorg/ministack](https://github.com/ministackorg/ministack), and the Transcribe, Translate and REST API authorizer support this stack depends on all arrived that way.

Work from a personal fork with `upstream` pointing at `ministackorg/ministack`, and follow its conventions rather than this repo's: ruff and pytest, not Biome and Jest, and one file per service under `ministack/services/`. A new service also needs registering in `ministack/app.py`, detection patterns in `ministack/core/router.py`, a fixture in `tests/conftest.py`, a row in its README table and a CHANGELOG entry. Its `CONTRIBUTING.md` carries the full checklist.

Resist adding a defensive workaround to this repo for emulator behaviour that AWS does not produce. It would outlive the emulator bug and mislead the next reader about what the real service does.

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