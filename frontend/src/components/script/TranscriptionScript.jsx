import { React, useEffect } from "react";

import { DialogueSegment } from "./ScriptSegment";

const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = totalSeconds % 3600;
  const minutes = ("00" + Math.floor(remainingSeconds / 60)).slice(-2);
  const seconds = ("00" + Math.floor(remainingSeconds % 60)).slice(-2);
  const milliseconds = (remainingSeconds % 1).toFixed(3).toString().slice(1, 5);

  return `${hours}:${minutes}:${seconds}${milliseconds}`;
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
