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

The batch translation test needs a MiniStack build that implements Amazon
Translate, which arrived in 1.5.10. That test fails against an older image.

Artifacts are written under `users/researcher1001/`, `transcription/` and
`translations/`, and removed afterwards, so a run leaves the stack as it found
it. A crashed run may leave objects behind; they are harmless and appear as
extra uploads in the UI.

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

Translation is covered on both paths: the source-equals-target short circuit,
where `translateStartHandler` copies the transcript rather than starting a job,
and the full batch leg, where it writes XLIFF, Translate produces output under
the `{account}-TranslateText-{JobId}/` folder AWS uses, and
`translateJobStateChangeHandler` merges the result back onto the transcript.

The batch test asserts structure rather than text: same segment count, same
`start_time` values, and every segment's text changed. MiniStack's translation
is a deterministic language-tagged transformation rather than real machine
translation, so asserting the text itself would pin the test to the emulator's
marker format without testing anything more.

Summary text is not asserted. MiniStack answers Bedrock with a canned reply
prefixed `[ministack mock` unless `MINISTACK_BEDROCK_PROXY_URL` points at an
OpenAI-compatible endpoint, so only the presence of a non-empty summary object
is meaningful here.

Nothing asserts the frontend's handling of a translated document, which is
where ERP-5140 surfaces: `assembleTranslatedDocument` keeps `audio_segments`
from the source, so their `language_code` and `transcript` still describe the
original audio. The local stack reproduces this, but there is no frontend test
runner to assert it against.
