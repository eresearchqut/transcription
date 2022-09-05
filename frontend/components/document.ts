import { Document, HeadingLevel, Paragraph, Table, TableCell, TableRow, WidthType } from "docx";

export interface Item {
  start_time: string; // "0.14"
  end_time: string // "0.49"
  alternatives: [
    {
      confidence: string // "1.0",
      content: string // thank
    }
  ],
  type: "pronunciation" | "punctuation"
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
      }
    ],
    speaker_labels: {
      segments: SpeakerSegment[]
    }
    segments: Segment[]

  };
}

export interface SpeakerSegment extends Timed {
  speaker_label: "spk_0" | "spk_1" | "spk_2" | "spk_3" | "spk_4" | "spk_5" | "spk_6" | "spk_7" | "spk_8" | "spk_9";
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
  spk_9: "Speaker 10"
};

const padTime = (time: string | number, length: number) => {
  return (new Array(length + 1).join("0") + time).slice(-length);
};

const formatTime = (time: string) => {
  let seconds: number | string = parseFloat(time);
  let hours;
  let minutes;
  hours = Math.floor(seconds / 3600);
  seconds = seconds - (hours * 3600);
  minutes = Math.floor(seconds / 60);
  seconds = Math.floor((seconds - (minutes * 60)));
  return padTime(hours, 2) + ":" + padTime(minutes, 2) + ":" + padTime(seconds, 2);
};

const table = (job: TranscriptJob, withAlternatives: boolean = false) => new Table({
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: {
            type: WidthType.PERCENTAGE,
            size: 12
          },
          children: [new Paragraph("Start Time")]
        }),
        new TableCell({
          width: {
            type: WidthType.PERCENTAGE,
            size: 12
          },
          children: [new Paragraph("Speaker")]
        }),
        new TableCell({
          children: [new Paragraph("Transcript")]
        })
      ]
    }),
    ...job.results.segments
      .map((segment, segmentIndex) => (withAlternatives ? segment.alternatives : segment.alternatives.slice(0, 1))
        .map((alternative, index) => new TableRow({
          children: index === 0
            ? [
              cell(formatTime(segment.start_time)),
              cell(speakers[job.results.speaker_labels.segments[segmentIndex].speaker_label]),
              cell(alternative.transcript)]
            : [
              cell(`Alternative ${index}`, 2),
              cell(alternative.transcript)
            ]
        }))).flat(1)
  ]
});

export const cell = (text: string, columnSpan?: number) =>
  new TableCell({
    margins: {
      left: 40,
      right: 40,
      top: 40,
      bottom: 40
    },
    children: [new Paragraph(text)], columnSpan
  });

export const heading = (text: string, pageBreakBefore: boolean = false) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore
  });


const document = (job: TranscriptJob) => new Document({
  sections: [
    {
      children: [
        heading("Transcript with speakers", true),
        table(job)
      ]
    },
    {

      children: [
        heading("Transcript with alternatives", true),
        table(job, true)
      ]
    },
    {

      children: [
        heading("Transcript", true),
        ...job.results.transcripts.map((transcript) => transcript.transcript)
          .map((transcript) => new Paragraph(transcript))
      ]
    }
  ]
});

export default document;

