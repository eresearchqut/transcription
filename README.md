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

The point is to change the stack and see the result without an AWS account, a deployed environment or anyone else's dev stack to share. That extends to signing in, which is not there to test authentication: the API's authorizer and the identity pool are both part of this deploy, so an identity token minted anywhere else is rejected, and without a local sign-in nothing behind the landing page can be reached at all.

Speech-to-text and machine translation are emulated. Transcribe returns a committed fixture transcript and Translate applies a deterministic language-tagged transformation, so neither says anything about transcription or translation quality.

Upload isolation is not enforced. The authenticated role restricts each user to `users/${aws:PrincipalTag/qutIdentityId}/` in the data bucket, and MiniStack resolves no `aws:PrincipalTag` key, so the condition the whole scheme rests on is never evaluated. It also evaluates IAM only when started with `AUTH=true`, which this stack does not set. Locally, then, any signed-in user can read and write another user's objects. The keys are still built from the identity id, so the paths can be checked, but that the policy denies anything else can only be confirmed in a deployed environment.

`FrontEndStack` is out of scope. It is CloudFront plus Lambda@Edge in us-east-1; locally the frontend runs under `next dev` against the local API.

### Prerequisites

Docker, with the daemon running and its socket readable, since handlers execute in sibling containers. The AWS CLI, which the helper scripts use to read stack outputs and seed users. Then `pnpm install` at the repo root. No AWS account, credentials or deployed stack are needed, and the scripts supply their own placeholder ones.

Sign-in needs one further step, trusting a certificate authority, which only exists once the stack has started. It is covered below, in the order to do it.

### Start it

```
pnpm dev
```

That starts the emulator, deploys both stacks, writes `frontend/.env.local`, seeds two Cognito users and starts the Next server on http://localhost:3000. It takes about a minute from cold.

Leave it running. On a machine that has already trusted the certificate authority, that is the whole setup and the next section can be skipped.

### Trust the certificate authority

One time per machine, in a second terminal while `pnpm dev` is running.

Amplify builds the hosted UI URLs with the scheme hardcoded to https, and the emulator gateway serves plain http on a single port, so a Caddy container terminates TLS on https://localhost:24443 and proxies the sign-in endpoints back to the gateway. It serves `/oauth2/*`, `/login`, `/logout` and `/.well-known/*` and refuses everything else, so it does not become a second way into an unauthenticated emulator. Caddy issues its own certificate authority the first time it starts, which nothing on your machine has any reason to trust yet.

Copy the authority out of the running container:

```
docker cp transcription-auth-proxy:/data/caddy/pki/authorities/local/root.crt ministack-root.crt
```

Then install it, which is the one part of this that differs by operating system:

| | |
| --- | --- |
| macOS | `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ministack-root.crt` |
| Linux | Copy it into `/usr/local/share/ca-certificates/` and run `sudo update-ca-certificates` |
| Windows | `certutil -addstore -f ROOT ministack-root.crt` from an elevated prompt |

Firefox keeps its own certificate store on every platform, so it needs the same file imported under Settings, Privacy and Security, Certificates. Chrome, Edge and Safari use the system store. Restart the browser afterwards. Nothing on the Docker side needs restarting, so `pnpm dev` can keep running throughout.

Skipping this leaves everything except sign-in working, and sign-in fails when the browser refuses the certificate on the token request. Clicking through the warning is not enough, because that request is a fetch rather than a navigation and never offers one. The authority is held in a volume, so it survives `pnpm ministack:down` and only has to be trusted again after `docker compose down -v`.

### Sign in

`/login` is the landing page, as it is in a deployed environment. Logging in redirects to the Cognito hosted UI, again as it does there, and signing in lands back in the app. The difference is what the hosted UI shows: a deployed pool federates to the QUT identity provider and goes straight there, while the local pool has no federation, so it shows its own username and password form. Use `researcher1` or `researcher2` with the password `password`.

### Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm ministack:up` | Start the emulator and deploy, without the frontend |
| `pnpm ministack:logs` | Follow the deploy, which is where CDK errors surface |
| `pnpm ministack:deploy` | Rebuild `model` and redeploy, after changing handler, model or stack code |
| `pnpm ministack:env` | Rewrite `frontend/.env.local` from the deployed stack outputs |
| `pnpm ministack:seed-users` | Recreate the two Cognito users |
| `pnpm ministack:down` | Stop the emulator and discard its state |

MiniStack holds its state in the container, so stopping it discards the stacks and every id changes on the next start. `frontend/.env.local` then holds a stale user pool client id, which surfaces as `Client ... not found`. `pnpm ministack:env` rewrites it, and `pnpm dev` does so on every start. Adding `-v` also removes the dependency volumes, which only makes the next start slower.

The bootstrap container finishes by running `cdklocal watch`, but a host edit to a bind-mounted file raises no inotify event inside the container on macOS, so code changes need `pnpm ministack:deploy`. That command synthesizes into its own output directory, since the watch process holds `cdk.out` for as long as it runs. It also rebuilds `model` first, because `model/dist` is a container volume rather than part of the bind mount, so a build run on the host never reaches the bundler.

The gateway is published on 24566 rather than the usual 4566, so this stack can run alongside other local emulators. It is bound to 127.0.0.1, because the emulator is unauthenticated and its container is privileged with the Docker socket mounted, so anyone who can reach the gateway can run containers on this machine. Opening it to other devices is opt-in, covered next.

### Opening the app from another device

The stack is deployed against `localhost` by default, and the browser resolves that to whatever device it is running on, so a phone loading `http://<your-machine>:3000` would look for Cognito, S3 and the API on the phone. `LOCAL_HOST` sets the host the browser is given instead, and `MINISTACK_BIND_HOST` publishes the gateway beyond loopback:

```
MINISTACK_BIND_HOST=0.0.0.0 LOCAL_HOST=<your-machine-address> pnpm dev
```

Both are needed. Without the first the emulator stays on loopback and the other device cannot reach it; without the second the browser is told to look for the emulator on itself. They hold different values because Docker Desktop on macOS binds only `127.0.0.1` or `0.0.0.0` and rejects a specific interface address, while `LOCAL_HOST` is baked into the stack outputs and is whatever the other device can resolve. This puts an unauthenticated emulator, on a privileged container with the Docker socket mounted, within reach of the network, so only do it on a network you trust.

`LOCAL_HOST` is read at deploy time and baked into the stack outputs, so changing it redeploys and rewrites `frontend/.env.local`. The helper scripts still reach the emulator on `localhost`, since they run on this machine. Use the address the other device can reach, not `0.0.0.0`.

Signing in is the exception. The TLS proxy's certificate is issued for `localhost`, so another device gets a name mismatch it cannot click past on the token request. Browsing an already signed-in session works; starting one does not.

### Keeping the emulator image current

`docker-compose.yml` runs `ministackorg/ministack:latest`, and Compose reuses the cached copy rather than checking for a newer one. A stale image presents as broken application code, since a service added since the pull is simply absent. Refresh it with `docker compose pull`. `MINISTACK_IMAGE` pins a specific release or points at a locally-built image.

### Job pacing

Transcribe and Translate batch jobs finish in seconds locally, against minutes on AWS, so a transcription reaches the browser almost fully formed and the queued and in-progress states the UI polls for barely appear. `TRANSCRIBE_JOB_RUN_SECONDS` and `TRANSLATE_JOB_RUN_SECONDS` stretch them, each split evenly between the job's two phases. Transcription runs at the emulator's default of 2 seconds and translation at 5, which is long enough to see a transcription arrive before its translation does:

```
TRANSCRIBE_JOB_RUN_SECONDS=120 TRANSLATE_JOB_RUN_SECONDS=600 pnpm ministack:up
```

Neither is read by the emulator itself. MiniStack 1.5.16 dropped `TRANSCRIBE_JOB_RUN_SECONDS`, leaving the admin endpoint as the only way to pace transcription, so the `transcription-job-pace` service posts both there once the gateway is healthy and exits. It runs on every `up`, matching how long the setting lasts, and fails the start if the endpoint stops recognising either key.

The values live in the gateway's memory, so a pace applies to the next job started and is lost when the container is recreated. To change it on a stack you already have, post to the endpoint yourself rather than restarting:

```
curl -X POST http://localhost:24566/_ministack/config \
  -H 'content-type: application/json' \
  -d '{"transcribe._JOB_RUN_SECONDS": 120, "translate._JOB_RUN_SECONDS": 600}'
```

It answers with the values it applied, and silently ignores anything it does not recognise, so check that response rather than assuming it took. Put them back afterwards, since `pnpm test:integration` waits for the chain and a long pace times it out.

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