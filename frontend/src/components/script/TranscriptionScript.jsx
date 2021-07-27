import { React, useEffect } from "react";

import { DialogueSegment } from "./ScriptSegment";

export const TranscriptionScript = (props) => {
  const speakerSegments = props.speakerLabels.segments.map((segment, index) => [
    segment,
    props.scriptSegments[index],
  ]);

  const rawText = [];

  const dialogueSegments = speakerSegments.map((segment, index) => {
    const [speakerSegment, dialogueSegment] = segment;
    const mainSpeaker = speakerSegment.speaker_label;
    const transcript = dialogueSegment.alternatives[0].transcript;

    rawText.push(mainSpeaker);
    rawText.push(transcript);
    rawText.push("");

    return (
      <DialogueSegment key={index} mainSpeaker={mainSpeaker}>
        {transcript}
      </DialogueSegment>
    );
  });

  useEffect(() => {
    props.getRawText(rawText.join("\n"));
  });

  return <div>{dialogueSegments}</div>;
};
