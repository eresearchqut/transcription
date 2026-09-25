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

The CDK app can be deployed against [MiniStack](https://ministack.org), a local AWS emulator. The same `deployment/lib/api-stack.ts` that provisions dev and prod provisions the local stack, so you can change the stack and see the result without an AWS account or a shared dev environment.

### Prerequisites

- Docker, with the daemon running. Handlers run in sibling containers, so the Docker socket must be readable.
- The AWS CLI, which the helper scripts use. No AWS credentials are needed.
- `pnpm install` at the repo root.

### Start it

```
pnpm dev
```

This starts the emulator, deploys the stacks, writes `frontend/.env.local`, seeds two Cognito users and starts the frontend on http://localhost:3000. It takes about a minute from cold. The first time on a machine, trust the certificate authority before signing in.

### Trust the certificate authority

Do this once per machine, while `pnpm dev` is running.

Amplify requires https for the Cognito hosted UI, so a Caddy container serves the sign-in endpoints on https://localhost:24443 and proxies them to the emulator. It refuses every other path. Caddy creates its own certificate authority on first start, which your machine needs to trust.

Copy it out of the container:

```
docker cp transcription-auth-proxy:/data/caddy/pki/authorities/local/root.crt ministack-root.crt
```

Then install it:

| | |
| --- | --- |
| macOS | `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ministack-root.crt` |
| Linux | Copy it into `/usr/local/share/ca-certificates/` and run `sudo update-ca-certificates` |
| Windows | `certutil -addstore -f ROOT ministack-root.crt` from an elevated prompt |

Firefox has its own certificate store, so import the file there as well, under Settings, Privacy and Security, Certificates. Restart the browser afterwards.

Without this, everything except sign-in works. Clicking through the browser warning doesn't help, because the request that fails is a background fetch. The authority is kept in a Docker volume, so it only needs trusting again after `docker compose down -v`.

### Sign in

Sign-in goes through the Cognito hosted UI, as in a deployed environment. The local pool has no QUT federation, so the hosted UI shows a username and password form. Use `researcher1` or `researcher2` with the password `password`.

### Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm ministack:up` | Start the emulator and deploy, without the frontend |
| `pnpm ministack:logs` | Follow the deploy, which is where CDK errors surface |
| `pnpm ministack:deploy` | Rebuild `model` and redeploy, after changing handler, model or stack code |
| `pnpm ministack:env` | Rewrite `frontend/.env.local` from the deployed stack outputs |
| `pnpm ministack:seed-users` | Recreate the two Cognito users |
| `pnpm ministack:down` | Stop the emulator and discard its state |

MiniStack keeps its state in the container, so stopping it discards the stacks and every id changes on the next start. A stale `frontend/.env.local` then fails with `Client ... not found`. `pnpm ministack:env` rewrites it, and `pnpm dev` does so on every start.

The bootstrap container runs `cdklocal watch`, but on macOS it doesn't see edits made on the host, so run `pnpm ministack:deploy` after changing code. It rebuilds `model` inside the container first, because the bundler can't see a `model/dist` built on the host.

### Ports

The emulator is published on http://localhost:20005, because Amplify Storage's local testing flag hardcodes that address. The flag is broken in the released package, so `patches/@aws-amplify__storage@6.16.0.patch` fixes it. The patch is pinned to the installed version, so upgrading Amplify fails `pnpm install` until the patch is regenerated or removed.

The emulator and the sign-in proxy are bound to 127.0.0.1. The emulator is unauthenticated and its container has the Docker socket, so anyone who can reach it can run containers on your machine.

### Opening the app from another device

To load the app from another device on your network, such as a phone:

```
MINISTACK_BIND_HOST=0.0.0.0 LOCAL_HOST=<your-machine-address> pnpm dev
```

`MINISTACK_BIND_HOST` publishes the emulator beyond loopback, and `LOCAL_HOST` is the address the browser is told to use, which is baked into the stack outputs. Only do this on a network you trust.

Two things still don't work from the other device. Starting a sign-in fails, because the TLS certificate is only valid for `localhost`. Uploads and downloads fail, because Amplify Storage always uses `localhost:20005`.

### Keeping the emulator image current

Compose reuses its cached copy of `ministackorg/ministack:latest`, and a stale image can look like broken application code. Run `docker compose pull` to refresh it. `MINISTACK_IMAGE` pins a release or points at a local build.

### Job pacing

Transcribe and Translate jobs finish in seconds locally, so the queued and in-progress states barely appear in the UI. To slow them down:

```
TRANSCRIBE_JOB_RUN_SECONDS=120 TRANSLATE_JOB_RUN_SECONDS=600 pnpm ministack:up
```

The defaults are 2 and 5 seconds. The `transcription-job-pace` service posts these to the emulator's config endpoint on every `up`. The emulator holds them in memory, so to change them on a running stack, post them yourself:

```
curl -X POST http://localhost:20005/_ministack/config \
  -H 'content-type: application/json' \
  -d '{"transcribe._JOB_RUN_SECONDS": 120, "translate._JOB_RUN_SECONDS": 600}'
```

Check the response, since the endpoint ignores keys it doesn't recognise. Reset the values afterwards, because a long pace makes `pnpm test:integration` time out.

### Summarisation

The emulated Bedrock returns a canned reply prefixed `[ministack mock`, so summaries are placeholders. For real summaries, point MiniStack at an OpenAI-compatible endpoint such as [Ollama](https://ollama.com):

```
MINISTACK_BEDROCK_PROXY_URL=http://host.docker.internal:11434 pnpm ministack:up
```

Give the base URL only, since MiniStack appends `/v1/chat/completions`. The setting is read when the container is created, and recreating the container wipes the stack, so expect a redeploy. If the endpoint is unreachable, MiniStack silently falls back to the canned reply, so check for the prefix before trusting a summary.

### Integration tests

`pnpm test` mocks AWS. `pnpm test:integration` runs against the local stack and checks that the S3 notifications, EventBridge rules and IAM grants in `deployment/lib/api-stack.ts` actually reach the handlers:

```
pnpm ministack:up
pnpm test:integration
```

It uses whatever stack is already running. CI runs it on every pull request, in `.github/workflows/integration.yaml`. The first run after a deploy builds a container per handler and can time out, so run it again before investigating. `api/test/integration/README.md` lists what it doesn't cover.

### Limitations

- Transcribe and Translate are emulated. Transcribe returns a fixture transcript and Translate applies a deterministic transformation, so neither says anything about quality.
- Upload isolation isn't enforced. MiniStack doesn't evaluate the `aws:PrincipalTag` condition that restricts each user to their own prefix, and only checks IAM at all when started with `AUTH=true`. Locally, any signed-in user can read and write another user's objects, so isolation can only be checked in a deployed environment.
- `FrontEndStack`, which is CloudFront and Lambda@Edge, isn't deployed locally. The frontend runs under `next dev` instead.

## Contributing to MiniStack

Fix emulator gaps upstream in [ministackorg/ministack](https://github.com/ministackorg/ministack) rather than working around them here. The Transcribe, Translate and REST API authorizer support this stack relies on arrived that way. Follow MiniStack's own conventions, which are ruff and pytest with one file per service under `ministack/services/`, and the checklist in its `CONTRIBUTING.md`. Don't add workarounds here for behaviour AWS doesn't have.

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