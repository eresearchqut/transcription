import { React, useEffect } from "react";

import { intervalToDuration } from "date-fns";

import { DialogueSegment } from "./ScriptSegment";

// https://stackoverflow.com/a/11818658
function toFixed(num, fixed) {
  var re = new RegExp("^-?\\d+(?:.\\d{0," + (fixed || -1) + "})?");
  return num.toString().match(re)[0];
}

let formatTime = (totalSeconds) => {
  const duration = intervalToDuration({ start: 0, end: totalSeconds * 1000 });

  const hours = duration.hours.toString().padStart(2, "0");
  const minutes = duration.minutes.toString().padStart(2, "0");
  const seconds = duration.seconds.toString().padStart(2, "0");
  const milliseconds = toFixed(totalSeconds % 1, 3)
    .toString()
    .slice(2, 5)
    .padEnd(3, "0");

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export const TranscriptionScript = (props) => {
  const speakerSegments = props.speakerLabels.segments.map((segment, index) => [
    segment,
    props.scriptSegments[index],
  ]);

  const rawText = [];

  const dialogueSegments = speakerSegments.map((segment, index) => {
    const [speakerSegment, dialogueSegment] = segment;
    const [mainSpeaker, startTime, endTime] = [
      speakerSegment.speaker_label,
      formatTime(speakerSegment.start_time),
      formatTime(speakerSegment.end_time),
    ];
    const transcript = dialogueSegment.alternatives[0].transcript;

    rawText.push(`${mainSpeaker}: ${startTime} - ${endTime}`);
    rawText.push(transcript);
    rawText.push("");

    return (
      <DialogueSegment
        key={index}
        mainSpeaker={mainSpeaker}
        startTime={startTime}
        endTime={endTime}
      >
        {transcript}
      </DialogueSegment>
    );
  });

  useEffect(() => {
    props.getRawText(rawText.join("\n"));
  });

  return <div>{dialogueSegments}</div>;
};
