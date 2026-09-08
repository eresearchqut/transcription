# Integration tests

`chain.test.ts` uploads a `.upload` object to the local stack and follows the
chain through to a stored transcript, summary and translation. Everything else
in `api/test` mocks the AWS SDK, so this is the only place that checks the
wiring in `deployment/lib/api-stack.ts`: the three overlapping S3 notification
filters on one bucket, the two EventBridge rules on the same detail type, and
the IAM grants each handler needs.

## Running it

The suite needs a deployed local stack, and does not start one:

```sh
docker compose up -d      # wait for the deploy, watch with pnpm ministack:logs
pnpm test:integration
```

It is excluded from `pnpm test`, which stays offline and needs no Docker.

Artifacts are written under `users/researcher1001/` and removed afterwards, so
a run leaves the stack as it found it. A crashed run may leave objects behind;
they are harmless and appear as extra uploads in the UI.

## Why not Testcontainers

The MiniStack Testcontainers module manages the emulator's lifecycle, which is
not the expensive part. The stack has to be bootstrapped and deployed with
cdklocal before any of this can run, and that takes five to eight minutes
against an emulator that starts in about thirty seconds. A per-run container
would pay that cost every time while testing wiring that changes only when
`api-stack.ts` changes.

It would also have to reproduce the two things `docker-compose.yml` sets up for
the Lambda docker executor: a mounted Docker socket and a named network the
handler containers attach to. Neither is a natural fit for a container the test
process owns, and getting them wrong fails in ways that look like application
bugs.

So the suite targets whatever stack is already running, which is the one a
developer has up anyway. The cost is that it cannot run unattended in CI. That
is an acceptable trade while the story is about local development; if these
assertions are ever wanted in CI, the deploy needs to become a cached step
rather than the test's responsibility.

## What it does not cover

Amazon Translate is not implemented in MiniStack (ERP-5116), so a real batch
translation cannot run locally. `translateStartHandler` fails cleanly against
the emulator, recording a `FAILED` translation job.

The suite therefore covers the translation leg through the branch that does
work: `en-AU` resolves to the Translate source code `en`, so asking for `en`
takes the source-equals-target path, which copies the transcript to the
translation key. That proves the second EventBridge rule fires and the handler
reads and writes the right keys. It does not exercise XLIFF generation or the
batch job, which `translateStartHandler.test.ts` and `xliff.test.ts` cover with
mocks.

Summary text is not asserted. MiniStack answers Bedrock with a canned reply
prefixed `[ministack mock` unless `MINISTACK_BEDROCK_PROXY_URL` points at an
OpenAI-compatible endpoint, so only the presence of a non-empty summary object
is meaningful here.
