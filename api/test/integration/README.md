# Integration tests

`chain.test.ts` uploads a `.upload` object to the local stack and follows it through to a stored transcript, summary and translation. Every other test in `api/test` mocks the AWS SDK, so this suite is the only check on the wiring in `deployment/lib/api-stack.ts`: the three overlapping S3 notification filters on one bucket, the two EventBridge rules on the same detail type, and the IAM grants each handler needs. The grants are only checked when MiniStack evaluates IAM, which CI turns on and local development leaves off.

## Running it

The suite needs a deployed local stack and does not start one:

```sh
pnpm ministack:up         # returns once the deploy is done; follow it with pnpm ministack:logs
pnpm test:integration
```

That checks the event wiring. To check the grants as well, start the stack with IAM evaluation, as CI does. Sign-in uploads from the frontend are denied in this mode, so recreate the stack without it before using the app:

```sh
pnpm ministack:down
MINISTACK_AUTH=true pnpm ministack:up
pnpm test:integration
```

`pnpm test` excludes it, so the unit tests stay offline and need no Docker. The batch translation test needs a MiniStack image with Amazon Translate support and fails on older ones.

The suite writes under `users/researcher1001/`, `transcription/` and `translations/`, and removes what it wrote afterwards. A crashed run can leave objects behind. They are harmless and show up as extra uploads in the UI.

## CI

`.github/workflows/integration.yaml` runs the suite on every pull request, with IAM evaluation on (`MINISTACK_AUTH=true`), so a handler missing a grant fails with `AccessDeniedException` in its logs. It starts the stack, waits for the deploy with `pnpm ministack:env`, then runs the tests. The MiniStack image and the two Lambda runtimes are pulled beforehand. MiniStack runs each invocation in a sibling container, so without the pre-pull the first invocations would download the runtimes inside the suite's timeouts.

## What it does not cover

Both translation paths run. One is the short circuit where the source and target languages match and `translateStartHandler` copies the transcript instead of starting a job. The other is the full batch path through XLIFF and `translateJobStateChangeHandler`. The suite does not assert:

- Translated text. MiniStack's translation is a deterministic, language-tagged transformation, so the batch test checks structure: the same segment count, the same `start_time` values, and changed text in every segment.
- Summary text. MiniStack answers Bedrock with a canned reply prefixed `[ministack mock` unless `MINISTACK_BEDROCK_PROXY_URL` points at an OpenAI-compatible endpoint, so the test only checks for a non-empty summary.
- How the frontend renders a translated document. `frontend` has no test runner.
