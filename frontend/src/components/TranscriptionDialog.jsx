import React, { useState } from "react";

import { intervalToDuration } from "date-fns";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { ClipboardButton } from "./ClipboardButton";
import { TranscriptionScript } from "./script/TranscriptionScript";

// https://stackoverflow.com/a/11818658
function toFixed(num, fixed) {
  var re = new RegExp("^-?\\d+(?:.\\d{0," + (fixed || -1) + "})?");
  return num.toString().match(re)[0];
}

const formatTime = (totalSeconds) => {
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

const parseSegment = (segment) => {
  const [speakerSegment, dialogueSegment] = segment;

  const mainSpeaker = speakerSegment.speaker_label;
  const startTime = parseFloat(speakerSegment.start_time);
  const endTime = parseFloat(speakerSegment.end_time);
  const alternatives = dialogueSegment.alternatives;
  const timestamp = `${formatTime(speakerSegment.start_time)} - ${formatTime(
    speakerSegment.end_time
  )}`;

  return {
    mainSpeaker,
    timestamp,
    alternatives,
    startTime,
    endTime,
  };
};

export const TranscriptionDialog = (props) => {
  const [dialogDisplayed, setDialogDisplayed] = useState(false);
  const [dialogState, setDialogState] = useState(null);

  const buildDialog = async () => {
    const dataDownloadUrl = await props.getUrl();
    const mediaUrl = await props.getMedia();

    const fileContent = await props.getData();
    const data = JSON.parse(await fileContent.Body.text());
    const results = data.results;

    const speakerSegments = results.speaker_labels.segments.map(
      (segment, index) => [segment, results.segments[index]]
    );

    const scriptSegments = speakerSegments.map(parseSegment);

    const rawScript = scriptSegments
      .map((segment) =>
        [
          `${segment.mainSpeaker}: ${segment.timestamp}`,
          segment.alternatives[0].transcript,
          "",
        ].join("\n")
      )
      .join("\n");

    const transcriptionScriptComponent = (
      <TranscriptionScript
        mediaUrl={mediaUrl}
        scriptSegments={scriptSegments}
      />
    );

    setDialogState({
      rawScript,
      dataDownloadUrl,
      transcriptionScriptComponent,
    });
  };

  const rawUrl = window.URL.createObjectURL(new Blob([dialogState?.rawScript]));

  const footer = (
    <div>
      <ClipboardButton text={dialogState?.rawScript} />
      <a href={rawUrl} download="transcription.txt">
        <Button label="Download transcription " />
      </a>
      <a href={dialogState?.dataDownloadUrl} download="transcription.json">
        <Button label="Download transcription data" />
      </a>
    </div>
  );

  return (
    <React.Fragment>
      <Button
        label="Download"
        icon="pi pi-external-link"
        onClick={() => {
          setDialogDisplayed(true);
          buildDialog();
        }}
        disabled={props.disabled}
      />

      <Dialog
        header={props.filename}
        visible={dialogDisplayed}
        style={{ width: "50vw" }}
        onHide={() => setDialogDisplayed(false)}
        footer={footer}
        dismissableMask={true}
      >
        {dialogState?.transcriptionScriptComponent ||
          "Loading transcription..."}
      </Dialog>
    </React.Fragment>
  );
};
