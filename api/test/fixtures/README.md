# Transcribe fixtures

Known-good Amazon Transcribe output documents, used as test input for the code
that consumes them.

## Why they exist

Most of what this repository does with a transcript is reshape it: rebuilding a
document around translated segment text, joining segments to speaker and
language metadata, and rendering SRT, VTT and plain text. That logic needs
input with known content to be asserted against.

Neither real Transcribe nor MiniStack's emulation provides it. Real jobs are
slow, cost money and return whatever the audio happened to contain. MiniStack
performs no speech recognition at all and synthesises a placeholder transcript
from a digest of the media URI, which is well-formed and content-free.

So the two are used for different questions:

| Question | Answered by |
| --- | --- |
| Is the chain wired up? Does an upload start a job, and does the output reach the user's prefix? | The local MiniStack stack, using its synthetic transcript. Content is irrelevant here. |
| Is the transcript handled correctly? Do speaker labels, language switching and redaction survive the reshaping? | Tests over these fixtures. No emulator involved. |

Splitting them this way keeps the correctness tests fast, deterministic and free
of Docker, and keeps the local stack focused on integration rather than content.

## What a fixture is

A **complete Transcribe output document**, held as JSON: the exact bytes the
service writes to the output bucket, loaded and passed straight into the code
under test. Not a template, and not trimmed to the fields a particular test
happens to read, so a consumer that starts reading a new field does not need the
fixtures changed.

They stay JSON rather than becoming TypeScript modules. JSON is the wire format,
which is the point of them, and it keeps them readable by anything that consumes
a transcript rather than only by code that can import a module.

Type safety comes from the generator instead. `build-transcribe-fixtures.mts`
declares the document shape as an extension of the `TranscriptDocument` that
`src/util/transcript.ts` reads, and `tsconfig.json` includes it, so a fixture the
application could not accept fails to compile. Building the document is what can
get the shape wrong, so that is where the checking belongs.

All three carry `segments`, `audio_segments` and `speaker_labels`, because
`api/src/event/fileUploadHandler.ts` always starts jobs with `ShowSpeakerLabels`
and `ShowAlternatives` set. A fixture without them would not match any job this
application starts.

## The fixture set

| File | Covers |
| --- | --- |
| `transcribe/single-language.json` | Two speakers, one language. The ordinary case. No per-item language codes, since a single-language job reports its language on the job record. |
| `transcribe/multi-language.json` | Speakers switching between `en-AU` and `fr-FR`. Every item and audio segment carries a `language_code`, which is what drives the `[EN-AU]` prefixes in subtitle output. |
| `transcribe/pii-redacted.json` | Output of a job started with `ContentRedaction`, identifying spans already replaced by `[PII]`. Our stack forces `en-US` when redaction is enabled, so this fixture is `en-US`. `RedactionOutput` is `REDACTED`, so only the redacted document exists. |

## Who uses them

- `api/test/util/transcript.test.ts` covers `assembleTranslatedDocument`, which
  rebuilds a document around translated segment text. The fixtures are what make
  it possible to assert that segment timings, the `start_time` join and speaker
  labels survive that rebuild.

They live here, next to their only consumer, rather than somewhere shared. The
frontend renderers in `frontend/components/segmentSubtitles.ts` and
`transcriptSegments.ts` are the other intended consumers, and the highest-risk
ones, but `frontend` has no test runner so nothing there can use them yet. Move
them somewhere shared if that changes.

## Regenerating

The documents are generated, not hand-written:

```
pnpm fixtures
```

Edit the turn specifications at the top of `build-transcribe-fixtures.mts` and
regenerate. The output is committed, so tests read it without running node, and
regeneration is reproducible: running `pnpm fixtures` with no specification
change must leave the working tree clean.

Generation exists because the fixtures' internal consistency is the whole point
of them, and hand-editing drifts it apart silently:

- `frontend/components/transcriptSegments.ts` joins `segments` to
  `audio_segments` **by `start_time`**, falling back to positional matching.
  A mismatch does not throw; it attaches the wrong speaker to a line.
- `audio_segments[].items` indexes into `results.items`.
- `speaker_labels.segments` must span the same ranges as the audio segments.
- Word timings must not overlap or run backwards.

Every one of those failures surfaces as subtitles that look subtly wrong rather
than as an error, which is exactly the failure mode fixtures are supposed to
remove.
