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

const documentSegments = (
  job: TranscriptJob,
): { start_time: string; end_time: string; alternatives: Alternative[] }[] => {
  if (job.results.segments?.length) return job.results.segments;
  return (job.results.audio_segments ?? [])
    .filter((segment) => segment.transcript.trim().length > 0)
    .map((segment) => ({
      start_time: segment.start_time,
      end_time: segment.end_time,
      alternatives: [{ transcript: segment.transcript }],
    }));
};

const table = (job: TranscriptJob, withAlternatives: boolean = false) => {
  const formatSpeakerLabel = (startTime: string, endTime: string) => {
    const speakerLabel = job.results.speaker_labels.segments.find(
      ({ start_time: speakerStartTime }) =>
        parseFloat(speakerStartTime) <= parseFloat(endTime) &&
        parseFloat(speakerStartTime) >= parseFloat(startTime),
    )?.speaker_label;

    return speakerLabel ? speakers[speakerLabel] : "";
  };

  return new Table({
    width: {
      type: WidthType.PERCENTAGE,
      size: 100,
    },
    // DXA units (twentieths of a point); 8640 = default content width (12240 DXA page − 1800 DXA margins each side), split 12%/12%/76%
    columnWidths: [1037, 1037, 6566],
    // FIXED layout ensures the column grid is respected rather than auto-sized by content
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: {
              type: WidthType.PERCENTAGE,
              size: 12,
            },
            children: [new Paragraph("Start Time")],
          }),
          new TableCell({
            width: {
              type: WidthType.PERCENTAGE,
              size: 12,
            },
            children: [new Paragraph("Speaker")],
          }),
          new TableCell({
            width: {
              type: WidthType.PERCENTAGE,
              size: 76,
            },
            children: [new Paragraph("Transcript")],
          }),
        ],
      }),
      ...documentSegments(job).flatMap((segment) =>
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
                      cell(
                        formatSpeakerLabel(
                          segment.start_time,
                          segment.end_time,
                        ),
                      ),
                      cell(alternative.transcript),
                    ]
                  : [
                      cell(`Alternative ${index}`, 2),
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

const transcriptDocument = (job: TranscriptJob) =>
  new Document({
    sections: [
      {
        children: [heading("Transcript with speakers", true), table(job)],
      },
      {
        children: [
          heading("Transcript with alternatives", true),
          table(job, true),
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
