# Transcribe fixtures

Complete Amazon Transcribe output documents, used as input for the code that reshapes transcripts. `test/util/transcript.test.ts` reads them.

MiniStack does no speech recognition. It returns a placeholder transcript derived from the media URI, so the local stack shows that the chain is wired up without saying anything about whether a real transcript is handled correctly. These fixtures cover that second question, with no emulator involved.

## What a fixture is

Each file holds the exact JSON the service writes to the output bucket, loaded and passed straight to the code under test. None is trimmed to the fields one test reads, so code that starts reading a new field needs no fixture change.

Type safety comes from the generator. `build-transcribe-fixtures.mts` declares the document shape as an extension of `TranscriptDocument` from `src/util/transcript.ts`, and `tsconfig.json` includes the generator, so a fixture the application could not accept fails to compile.

All three include `segments`, `audio_segments` and `speaker_labels`, because `src/event/fileUploadHandler.ts` always starts jobs with `ShowSpeakerLabels` and `ShowAlternatives`.

## The fixtures

| File | Covers |
| --- | --- |
| `transcribe/single-language.json` | Two speakers in one language, the ordinary case. Items carry no language code, since a single-language job reports its language on the job record. |
| `transcribe/multi-language.json` | Speakers switching between `en-AU` and `fr-FR`. Every item and audio segment has a `language_code`, which produces the `[EN-AU]` prefixes in subtitle output. |
| `transcribe/pii-redacted.json` | A job started with `ContentRedaction`, with identifying spans replaced by `[PII]`. The stack forces `en-US` when redaction is on, and `RedactionOutput` is `REDACTED`, so only the redacted document exists. |

## Regenerating

```sh
pnpm fixtures
```

Edit the turn specifications at the top of `build-transcribe-fixtures.mts`, then regenerate from the repo root. The output is committed. Regeneration is reproducible, so running `pnpm fixtures` without changing a specification must leave the working tree clean.

Do not edit the JSON by hand. The files are only useful while they are internally consistent, and a broken invariant fails silently instead of throwing:

- `frontend/components/transcriptSegments.ts` joins `segments` to `audio_segments` by `start_time`, falling back to position. A mismatch attaches the wrong speaker to a line.
- `audio_segments[].items` indexes into `results.items`.
- `speaker_labels.segments` must span the same ranges as the audio segments.
- Word timings must not overlap or run backwards.
