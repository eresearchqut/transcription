# Transcription frontend

A Next.js app using the pages router, built as a static export (`output: "export"`) that `TranscriptionFrontEndStack` serves from S3 and CloudFront. It uses Chakra UI for components, TanStack Query for API calls, and Amplify for Cognito sign-in and S3 access.

## Running it

Start it from the repo root, which builds the workspace packages it imports (such as `model`) before starting `next dev`:

- `pnpm dev` starts the local stack and points the frontend at it.
- `pnpm dev:frontend` starts only the frontend, using whatever `.env.development.local` holds. To use the deployed dev environment, follow the root README's section on it first.

Both serve http://localhost:3000.

## Configuration

Settings are `NEXT_PUBLIC_` variables, inlined at build time. `.env` holds the defaults shared by every environment. The rest, such as the API URL, user pool and bucket, come from the `FrontEndEnvironment` output of `TranscriptionStack`: `pnpm ministack:env` writes it to `.env.development.local` for the local stack, and the deploy workflow writes it to `.env.production`. Only `next dev` reads the development file, so local settings never reach a production build.

`NEXT_PUBLIC_AWS_ENDPOINT` is set only for the local stack. When it is present, `pages/_app.tsx` points Amplify Storage at the emulator.

## Other commands

Run these from `frontend/`:

- `pnpm build` writes the static export to `out/`.
- `pnpm serve` serves `out/` on port 3000.
- `pnpm storybook` starts Storybook on port 6006.

Lint and format checks run from the repo root with `pnpm lint` and `pnpm fmt`.
