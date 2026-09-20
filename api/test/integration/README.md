# Integration tests

`chain.test.ts` uploads a `.upload` object to the local stack and follows the chain through to a stored transcript, summary and translation. Everything else in `api/test` mocks the AWS SDK, so this is the only place that checks the wiring in `deployment/lib/api-stack.ts`: the three overlapping S3 notification filters on one bucket, the two EventBridge rules on the same detail type, and the IAM grants each handler needs.

## Running it

The suite needs a deployed local stack and does not start one:

```sh
pnpm ministack:up         # returns once the deploy is done; follow it with pnpm ministack:logs
pnpm test:integration
```

It is excluded from `pnpm test`, which stays offline and needs no Docker. The batch translation test needs a MiniStack build that implements Amazon Translate, and fails against an image predating it.

Artifacts are written under `users/researcher1001/`, `transcription/` and `translations/`, and removed afterwards. A crashed run may leave objects behind; they are harmless and appear as extra uploads in the UI.

## Running it in CI

`.github/workflows/integration.yaml` runs this suite on pull requests that touch `api/`, `model/`, the CDK app or the MiniStack scripts. It starts the stack, waits for the deploy with `pnpm ministack:env`, and runs the suite. The MiniStack image and the two Lambda runtimes are pre-pulled, since MiniStack runs each invocation in a sibling container and would otherwise fetch them inside the suite's own timeouts.

## What it does not cover

Both translation paths are covered: the source-equals-target short circuit, where `translateStartHandler` copies the transcript rather than starting a job, and the full batch leg through XLIFF and `translateJobStateChangeHandler`. What is not asserted:

- Translated text. MiniStack's translation is a deterministic language-tagged transformation, so the batch test asserts structure instead: same segment count, same `start_time` values, and every segment's text changed.
- Summary text. MiniStack answers Bedrock with a canned reply prefixed `[ministack mock` unless `MINISTACK_BEDROCK_PROXY_URL` points at an OpenAI-compatible endpoint, so only the presence of a non-empty summary object is meaningful.
- The frontend's rendering of a translated document. `frontend` has no test runner to assert against.
