import {
  Document,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  WidthType,
} from "docx";

export interface Item {
  start_time?: string; // "0.14"
  end_time?: string; // "0.49"
  alternatives: [
    {
      confidence: string; // "1.0",
      content: string; // thank
    },
  ];
  type: "pronunciation" | "punctuation";
  language_code?: string;
}

export interface AudioSegment {
  id: number;
  transcript: string;
  start_time: string;
  end_time: string;
  items: number[];
  language_code?: string;
  speaker_label?: string;
}

export interface Timed {
  start_time: string; // "0.0"
  end_time: string; // "3.78"
}

export interface Alternative {
  transcript: string;
}

export interface Segment extends Timed {
  alternatives: [Alternative, ...[Alternative]];
}

export interface TranscriptJob {
  jobName: string;
  accountId: string;
  status: string;
  results: {
    transcripts: [
      {
        transcript: string;
      },
    ];
    speaker_labels: {
      segments: SpeakerSegment[];
    };
    segments: Segment[];
    items?: Item[];
    audio_segments?: AudioSegment[];
  };
}

export interface SpeakerSegment extends Timed {
  speaker_label:
    | "spk_0"
    | "spk_1"
    | "spk_2"
    | "spk_3"
    | "spk_4"
    | "spk_5"
    | "spk_6"
    | "spk_7"
    | "spk_8"
    | "spk_9";
}

const speakers = {
  spk_0: "Speaker 1",
  spk_1: "Speaker 2",
  spk_2: "Speaker 3",
  spk_3: "Speaker 4",
  spk_4: "Speaker 5",
  spk_5: "Speaker 6",
  spk_6: "Speaker 7",
  spk_7: "Speaker 8",
  spk_8: "Speaker 9",
  spk_9: "Speaker 10",
};

const padTime = (time: string | number, length: number) => {
  return (new Array(length + 1).join("0") + time).slice(-length);
};

const formatTime = (time: string) => {
  let seconds: number | string = parseFloat(time);
  const hours = Math.floor(seconds / 3600);
  seconds = seconds - hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds - minutes * 60);
  return `${padTime(hours, 2)}:${padTime(minutes, 2)}:${padTime(seconds, 2)}`;
};

interface DocumentSegment {
  start_time: string;
  end_time: string;
  alternatives: Alternative[];
  language_code?: string;
  speaker_label?: string;
}

const documentSegments = (job: TranscriptJob): DocumentSegment[] => {
  const audioSegments = job.results.audio_segments ?? [];
  const segments = job.results.segments ?? [];

  // Original transcripts expose both `segments` (word-level `alternatives`) and
  // `audio_segments` (which carry `language_code` and `speaker_label`). Keep the
  // richer `alternatives` from `segments` but enrich each with the language and
  // speaker from its parallel audio segment. Translations expose only
  // `segments` (no language/speaker), so those fields stay undefined.
  if (segments.length) {
    return segments.map((segment, index) => {
      const audio =
        audioSegments.find(
          (candidate) => candidate.start_time === segment.start_time,
        ) ?? audioSegments[index];
      return {
        start_time: segment.start_time,
        end_time: segment.end_time,
        alternatives: segment.alternatives,
        language_code: audio?.language_code,
        speaker_label: audio?.speaker_label,
      };
    });
  }

  return audioSegments
    .filter((segment) => segment.transcript.trim().length > 0)
    .map((segment) => ({
      start_time: segment.start_time,
      end_time: segment.end_time,
      alternatives: [{ transcript: segment.transcript }],
      language_code: segment.language_code,
      speaker_label: segment.speaker_label,
    }));
};

/** Whether any segment carries an identified language code. */
const hasLanguageCodes = (segments: DocumentSegment[]): boolean =>
  segments.some((segment) => !!segment.language_code);

export interface DocumentOptions {
  withAlternatives?: boolean;
  includeSpeakers?: boolean;
  includeLanguages?: boolean;
}

const table = (
  job: TranscriptJob,
  {
    withAlternatives = false,
    includeSpeakers = false,
    includeLanguages = false,
  }: DocumentOptions = {},
) => {
  const segments = documentSegments(job);
  const showLanguages = includeLanguages && hasLanguageCodes(segments);

  const formatSpeakerLabel = (segment: DocumentSegment) => {
    const label =
      segment.speaker_label ??
      job.results.speaker_labels?.segments.find(
        ({ start_time: speakerStartTime }) =>
          parseFloat(speakerStartTime) <= parseFloat(segment.end_time) &&
          parseFloat(speakerStartTime) >= parseFloat(segment.start_time),
      )?.speaker_label;
    if (!label) return "";
    return speakers[label as keyof typeof speakers] ?? label;
  };

  // Column layout in percentages; Transcript takes the remaining width.
  const timeWidth = 12;
  const languageWidth = showLanguages ? 15 : 0;
  const speakerWidth = includeSpeakers ? 12 : 0;
  const transcriptWidth = 100 - timeWidth - languageWidth - speakerWidth;
  const columnWidthPercentages = [
    timeWidth,
    ...(showLanguages ? [languageWidth] : []),
    ...(includeSpeakers ? [speakerWidth] : []),
    transcriptWidth,
  ];
  // DXA units (twentieths of a point); 8640 = default content width
  // (12240 DXA page − 1800 DXA margins each side).
  const contentWidth = 8640;
  const columnWidths = columnWidthPercentages.map((percentage) =>
    Math.round((contentWidth * percentage) / 100),
  );
  const columnCount = columnWidthPercentages.length;

  const headerCell = (text: string, size: number) =>
    new TableCell({
      width: { type: WidthType.PERCENTAGE, size },
      children: [new Paragraph(text)],
    });

  const headerRow = new TableRow({
    children: [
      headerCell("Start Time", timeWidth),
      ...(showLanguages ? [headerCell("Language", languageWidth)] : []),
      ...(includeSpeakers ? [headerCell("Speaker", speakerWidth)] : []),
      headerCell("Transcript", transcriptWidth),
    ],
  });

  return new Table({
    width: {
      type: WidthType.PERCENTAGE,
      size: 100,
    },
    columnWidths,
    // FIXED layout ensures the column grid is respected rather than auto-sized by content
    layout: TableLayoutType.FIXED,
    rows: [
      headerRow,
      ...segments.flatMap((segment) =>
        (withAlternatives
          ? segment.alternatives
          : segment.alternatives.slice(0, 1)
        ).map(
          (alternative, index) =>
            new TableRow({
              children:
                index === 0
                  ? [
                      cell(formatTime(segment.start_time)),
                      ...(showLanguages
                        ? [cell((segment.language_code ?? "").toUpperCase())]
                        : []),
                      ...(includeSpeakers
                        ? [cell(formatSpeakerLabel(segment))]
                        : []),
                      cell(alternative.transcript),
                    ]
                  : [
                      cell(`Alternative ${index}`, columnCount - 1),
                      cell(alternative.transcript),
                    ],
            }),
        ),
      ),
    ],
  });
};

export const cell = (text: string, columnSpan?: number) =>
  new TableCell({
    margins: {
      left: 40,
      right: 40,
      top: 40,
      bottom: 40,
    },
    children: [new Paragraph(text)],
    columnSpan,
  });

export const heading = (text: string, pageBreakBefore: boolean = false) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore,
  });

const transcriptDocument = (
  job: TranscriptJob,
  { includeSpeakers = false, includeLanguages = false }: DocumentOptions = {},
) =>
  new Document({
    sections: [
      {
        children: [
          heading(
            includeSpeakers ? "Transcript with speakers" : "Transcript",
            true,
          ),
          table(job, { includeSpeakers, includeLanguages }),
        ],
      },
      {
        children: [
          heading("Transcript with alternatives", true),
          table(job, {
            withAlternatives: true,
            includeSpeakers,
            includeLanguages,
          }),
        ],
      },
      {
        children: [
          heading("Transcript", true),
          ...job.results.transcripts
            .map((transcript) => transcript.transcript)
            .map((transcript) => new Paragraph(transcript)),
        ],
      },
    ],
  });

export default transcriptDocument;
