# Transcribe fixtures

Known-good Amazon Transcribe output documents, used as test input for the code that reshapes them.

MiniStack performs no speech recognition and synthesises a placeholder transcript from a digest of the media URI, so the local stack can show that the chain is wired up but says nothing about whether a transcript is handled correctly. These fixtures answer that second question, with no emulator involved.

## What a fixture is

A complete Transcribe output document held as JSON: the exact bytes the service writes to the output bucket, loaded and passed straight into the code under test. Not a template, and not trimmed to the fields a particular test reads, so a consumer that starts reading a new field does not need the fixtures changed.

Type safety comes from the generator. `build-transcribe-fixtures.mts` declares the document shape as an extension of the `TranscriptDocument` that `src/util/transcript.ts` reads, and `tsconfig.json` includes it, so a fixture the application could not accept fails to compile.

All three carry `segments`, `audio_segments` and `speaker_labels`, because `api/src/event/fileUploadHandler.ts` always starts jobs with `ShowSpeakerLabels` and `ShowAlternatives` set.

## The fixture set

| File | Covers |
| --- | --- |
| `transcribe/single-language.json` | Two speakers, one language. The ordinary case. No per-item language codes, since a single-language job reports its language on the job record. |
| `transcribe/multi-language.json` | Speakers switching between `en-AU` and `fr-FR`. Every item and audio segment carries a `language_code`, which drives the `[EN-AU]` prefixes in subtitle output. |
| `transcribe/pii-redacted.json` | Output of a job started with `ContentRedaction`, identifying spans already replaced by `[PII]`. Our stack forces `en-US` when redaction is enabled. `RedactionOutput` is `REDACTED`, so only the redacted document exists. |

## Regenerating

```sh
pnpm fixtures
```

Edit the turn specifications at the top of `build-transcribe-fixtures.mts` and regenerate. The output is committed, and regeneration is reproducible: `pnpm fixtures` with no specification change must leave the working tree clean.

Do not hand-edit them. Their internal consistency is the point of them, and these invariants fail silently rather than throwing:

- `frontend/components/transcriptSegments.ts` joins `segments` to `audio_segments` by `start_time`, falling back to positional matching. A mismatch attaches the wrong speaker to a line.
- `audio_segments[].items` indexes into `results.items`.
- `speaker_labels.segments` must span the same ranges as the audio segments.
- Word timings must not overlap or run backwards.
