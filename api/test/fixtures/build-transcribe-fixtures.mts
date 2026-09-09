/**
 * Builds the committed Transcribe fixture documents from the compact turn
 * specifications below.
 *
 * The documents are generated rather than hand-written because their internal
 * consistency is what makes them useful: `segments` and `audio_segments` are
 * joined by `start_time` in frontend/components/transcriptSegments.ts, and
 * `audio_segments[].items` indexes into `results.items`. Hand-editing drifts
 * those apart silently, and the symptom is broken subtitles rather than a
 * failing assertion.
 *
 * Regenerate after editing a specification:
 *   pnpm fixtures
 *
 * The output is committed, so the fixtures can be read without running node.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { TranscriptDocument } from "../../src/util/transcript.js";

const outputDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "transcribe",
);

/** One speaker speaking continuously. */
interface Turn {
  speaker: number;
  text: string;
  /** Set only for multi-language fixtures, where items carry a language. */
  language?: string;
}

interface Specification {
  description: string;
  turns: Turn[];
  /** A single-language job; reported on the job record, not per item. */
  languageCode?: string;
  /** A job started with IdentifyMultipleLanguages. */
  languageCodes?: string[];
}

interface Alternative {
  confidence: string;
  content: string;
}

/** A word-level item. Punctuation carries no timings, as in the real service. */
interface Item {
  type: "pronunciation" | "punctuation";
  start_time?: string;
  end_time?: string;
  language_code?: string;
  alternatives: Alternative[];
}

interface AudioSegment {
  id: number;
  transcript: string;
  start_time: string;
  end_time: string;
  speaker_label: string;
  language_code?: string;
  /** Indices into `results.items`. */
  items: number[];
}

interface Segment {
  start_time: string;
  end_time: string;
  alternatives: { transcript: string; items: Item[] }[];
}

interface SpeakerRange {
  start_time: string;
  end_time: string;
  speaker_label: string;
}

interface SpeakerSegment extends SpeakerRange {
  items: SpeakerRange[];
}

/**
 * `TranscriptDocument` in src/util/transcript.ts is the minimum the application
 * reads. This is the full document the service writes, so it stays assignable
 * to that type: a fixture the consumer could not accept would be useless.
 */
type Fixture = TranscriptDocument & {
  jobName: string;
  accountId: string;
  status: string;
  results: {
    transcripts: { transcript: string }[];
    items: Item[];
    audio_segments: AudioSegment[];
    segments: Segment[];
    speaker_labels: { speakers: number; segments: SpeakerSegment[] };
    language_codes?: { language_code: string; duration_in_seconds: number }[];
  };
};

/** Seconds of audio attributed to each word. */
const WORD_SECONDS = 0.42;
/** Silence inserted between one speaker's turn and the next. */
const TURN_GAP_SECONDS = 0.34;

/**
 * Amazon Transcribe reports times as seconds with millisecond resolution and
 * no trailing-zero padding, e.g. "0.0", "1.35", "12.6".
 */
const formatTime = (seconds: number): string =>
  String(Math.round(seconds * 100) / 100);

/**
 * A turn is one speaker speaking continuously. It becomes exactly one
 * audio segment, one entry in `segments` and one diarisation segment, which is
 * how real Transcribe groups speech separated by pauses and speaker changes.
 */
const specifications: Record<string, Specification> = {
  "single-language": {
    description:
      "Two speakers, one language. The ordinary case: every segment carries a speaker label and no language codes, since a single-language job reports its language on the job record rather than per item.",
    languageCode: "en-AU",
    turns: [
      { speaker: 0, text: "Good morning, thanks for making the time today." },
      { speaker: 1, text: "No problem at all. Where would you like to start?" },
      {
        speaker: 0,
        text: "Let's begin with the interview consent, then move on to your research background.",
      },
      {
        speaker: 1,
        text: "That works for me. I've read the participant information sheet and I'm happy to proceed.",
      },
      {
        speaker: 0,
        text: "Excellent. I'll start the recording properly now.",
      },
    ],
  },
  "multi-language": {
    description:
      "One speaker switching between languages, plus a second speaker. Every item and audio segment carries a language_code, which is what a job started with IdentifyMultipleLanguages produces and what drives the [EN-AU] prefixes in subtitle output.",
    languageCodes: ["en-AU", "fr-FR"],
    turns: [
      {
        speaker: 0,
        language: "en-AU",
        text: "Before we continue, I'd like to ask a few questions in French.",
      },
      {
        speaker: 1,
        language: "fr-FR",
        text: "Bien sûr, allez-y, je vous écoute avec plaisir.",
      },
      {
        speaker: 0,
        language: "fr-FR",
        text: "Pouvez-vous décrire votre projet de recherche en quelques mots?",
      },
      {
        speaker: 1,
        language: "fr-FR",
        text: "Nous étudions les effets du changement climatique sur les récifs coralliens.",
      },
      {
        speaker: 0,
        language: "en-AU",
        text: "Thank you, that's very clear. Let's switch back to English now.",
      },
    ],
  },
  "pii-redacted": {
    description:
      "The output of a job started with ContentRedaction RedactionOutput=REDACTED, where identifying spans have already been replaced by [PII]. Our stack forces LanguageCode en-US when redaction is enabled, so this fixture is en-US rather than en-AU. Only the redacted document exists; there is no unredacted counterpart to compare against.",
    languageCode: "en-US",
    turns: [
      {
        speaker: 0,
        text: "Could you confirm your full name for the record please?",
      },
      {
        speaker: 1,
        text: "My name is [PII] and I live at [PII] in [PII].",
      },
      {
        speaker: 0,
        text: "Thank you. And the best contact number for you is [PII]?",
      },
      {
        speaker: 1,
        text: "That's right, and my date of birth is [PII] if you need it.",
      },
    ],
  },
};

const PUNCTUATION = /^[.,?!;:]$/;

interface Token {
  content: string;
  punctuation: boolean;
}

/**
 * Split a turn into Transcribe's word-level items. Trailing punctuation
 * becomes its own item with type "punctuation" and no timings, exactly as the
 * real service reports it, so consumers that walk `results.items` meet the
 * same shape they meet in production.
 */
const tokenise = (text: string): Token[] => {
  const tokens: Token[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const match = /^(.*?)([.,?!;:]+)$/.exec(word);
    if (match?.[1]) {
      tokens.push({ content: match[1], punctuation: false });
      for (const mark of match[2]) {
        tokens.push({ content: mark, punctuation: true });
      }
    } else if (PUNCTUATION.test(word)) {
      tokens.push({ content: word, punctuation: true });
    } else {
      tokens.push({ content: word, punctuation: false });
    }
  }
  return tokens;
};

const buildDocument = (
  jobName: string,
  specification: Specification,
): Fixture => {
  const { turns, languageCodes } = specification;
  const multiLanguage = Array.isArray(languageCodes);

  const items: Item[] = [];
  const audioSegments: AudioSegment[] = [];
  const segments: Segment[] = [];
  const speakerSegments: SpeakerSegment[] = [];

  let clock = 0;

  turns.forEach((turn, position) => {
    const speakerLabel = `spk_${turn.speaker}`;
    const turnLanguage = multiLanguage ? turn.language : undefined;
    const tokens = tokenise(turn.text);

    const startIndex = items.length;
    const itemIndices: number[] = [];
    const speakerItems: SpeakerRange[] = [];
    let segmentStart: string | undefined;
    let segmentEnd: string | undefined;

    for (const token of tokens) {
      const index = items.length;
      itemIndices.push(index);

      if (token.punctuation) {
        items.push({
          type: "punctuation",
          alternatives: [{ confidence: "0.0", content: token.content }],
        });
        continue;
      }

      const start = clock;
      const end = clock + WORD_SECONDS;
      clock = end;

      const item: Item = {
        type: "pronunciation",
        start_time: formatTime(start),
        end_time: formatTime(end),
        alternatives: [{ confidence: "1.0", content: token.content }],
      };
      if (turnLanguage) {
        item.language_code = turnLanguage;
      }
      items.push(item);

      if (segmentStart === undefined) {
        segmentStart = item.start_time;
      }
      segmentEnd = item.end_time;

      speakerItems.push({
        start_time: item.start_time as string,
        end_time: item.end_time as string,
        speaker_label: speakerLabel,
      });
    }

    clock += TURN_GAP_SECONDS;

    // A turn of pure punctuation would leave the segment untimed, which breaks
    // the start_time join every consumer relies on.
    if (segmentStart === undefined || segmentEnd === undefined) {
      throw new Error(
        `Turn ${position} of "${jobName}" has no spoken words to time`,
      );
    }

    const audioSegment: AudioSegment = {
      id: position,
      transcript: turn.text,
      start_time: segmentStart,
      end_time: segmentEnd,
      speaker_label: speakerLabel,
      items: itemIndices,
    };
    if (turnLanguage) {
      audioSegment.language_code = turnLanguage;
    }
    audioSegments.push(audioSegment);

    // `segments` is the ShowAlternatives view of the same turn. Our stack always
    // sets ShowAlternatives, so a fixture that omitted this would not match any
    // job this application starts. There is no recogniser to disagree with
    // itself, so a single alternative is reported rather than invented ones.
    segments.push({
      start_time: segmentStart,
      end_time: segmentEnd,
      alternatives: [
        {
          transcript: turn.text,
          items: items.slice(startIndex, items.length),
        },
      ],
    });

    speakerSegments.push({
      start_time: segmentStart,
      end_time: segmentEnd,
      speaker_label: speakerLabel,
      items: speakerItems,
    });
  });

  const results: Fixture["results"] = {
    transcripts: [{ transcript: turns.map((turn) => turn.text).join(" ") }],
    items,
    audio_segments: audioSegments,
    segments,
    speaker_labels: {
      speakers: new Set(turns.map((turn) => turn.speaker)).size,
      segments: speakerSegments,
    },
  };

  if (multiLanguage) {
    // Seconds of speech attributed to each language, which is what
    // IdentifyMultipleLanguages reports alongside the transcript.
    const spokenSeconds = (code: string): number =>
      turns
        .filter((turn) => turn.language === code)
        .reduce(
          (total, turn) =>
            total +
            tokenise(turn.text).filter((token) => !token.punctuation).length *
              WORD_SECONDS,
          0,
        );
    results.language_codes = languageCodes.map((code) => ({
      language_code: code,
      duration_in_seconds: Number(spokenSeconds(code).toFixed(2)),
    }));
  }

  return {
    jobName,
    accountId: "000000000000",
    status: "COMPLETED",
    results,
  };
};

for (const [name, specification] of Object.entries(specifications)) {
  const document = buildDocument(name, specification);
  const path = join(outputDirectory, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  console.log(
    `wrote ${path} (${document.results.audio_segments.length} segments, ${document.results.items.length} items)`,
  );
}
