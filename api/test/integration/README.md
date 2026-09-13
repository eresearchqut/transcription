# Integration tests

`chain.test.ts` uploads a `.upload` object to the local stack and follows the chain through to a stored transcript, summary and translation. Everything else in `api/test` mocks the AWS SDK, so this is the only place that checks the wiring in `deployment/lib/api-stack.ts`: the three overlapping S3 notification filters on one bucket, the two EventBridge rules on the same detail type, and the IAM grants each handler needs.

## Running it

The suite needs a deployed local stack and does not start one:

```sh
docker compose up -d      # wait for the deploy, watch with pnpm ministack:logs
pnpm test:integration
```

It is excluded from `pnpm test`, which stays offline and needs no Docker. The batch translation test needs a MiniStack build that implements Amazon Translate, which arrived in 1.5.10, and fails against an older image.

Artifacts are written under `users/researcher1001/`, `transcription/` and `translations/`, and removed afterwards. A crashed run may leave objects behind; they are harmless and appear as extra uploads in the UI.

## Why it does not run in CI

The suite targets whatever stack is already running rather than managing its own. The expensive part is not the emulator, which starts in about thirty seconds, but the `cdklocal` bootstrap and deploy in front of it, which takes five to eight minutes and would be paid on every run to test wiring that changes only when `api-stack.ts` does. Running these assertions in CI needs that deploy to become a cached step rather than the test's responsibility.

## What it does not cover

Both translation paths are covered: the source-equals-target short circuit, where `translateStartHandler` copies the transcript rather than starting a job, and the full batch leg through XLIFF and `translateJobStateChangeHandler`. What is not asserted:

- Translated text. MiniStack's translation is a deterministic language-tagged transformation, so the batch test asserts structure instead: same segment count, same `start_time` values, and every segment's text changed.
- Summary text. MiniStack answers Bedrock with a canned reply prefixed `[ministack mock` unless `MINISTACK_BEDROCK_PROXY_URL` points at an OpenAI-compatible endpoint, so only the presence of a non-empty summary object is meaningful.
- The frontend's handling of a translated document, which is where ERP-5140 surfaces. The local stack reproduces it, but `frontend` has no test runner to assert against.
