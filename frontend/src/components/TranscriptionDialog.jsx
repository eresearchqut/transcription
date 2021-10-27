import React, { useState } from "react";

import { intervalToDuration } from "date-fns";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { ClipboardButton } from "./dialog/ClipboardButton";
import { DownloadButton } from "./dialog/DownloadButton";
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
  const [speakerSegment, dialogueSegment, savedSegment] = segment;

  const mainSpeaker = speakerSegment.speaker_label;
  const startTime = parseFloat(speakerSegment.start_time);
  const endTime = parseFloat(speakerSegment.end_time);
  const alternatives = dialogueSegment.alternatives;
  const transcript = savedSegment || alternatives[0].transcript;
  const timestamp = `${formatTime(speakerSegment.start_time)} - ${formatTime(
    speakerSegment.end_time
  )}`;

  return {
    mainSpeaker,
    timestamp,
    alternatives,
    transcript,
    startTime,
    endTime,
  };
};

export const TranscriptionDialog = (props) => {
  const [dialogDisplayed, setDialogDisplayed] = useState(false);
  const [dialogState, setDialogState] = useState({
    mediaUrl: null,
    scriptSegments: [],
    dataDownloadUrl: null,
  });

  const setTranscript = (index, transcript) => {
    dialogState.scriptSegments[index].transcript = transcript;
    setDialogState(dialogState);
  };

  const buildDialog = async () => {
    const [dataDownloadUrl, mediaUrl, data] = await Promise.all([
      props.getUrl(),
      props.getMedia(),
      props.getData(),
    ]);
    const results = data.results;

    const speakerSegments = results.speaker_labels.segments.map(
      (segment, index) => [
        segment,
        results.segments[index],
        results.savedSegments?.[index],
      ]
    );

    const scriptSegments = speakerSegments.map(parseSegment);

    setDialogState({
      mediaUrl,
      scriptSegments,
      dataDownloadUrl,
    });
  };

  const getRawScript = () =>
    dialogState.scriptSegments
      .map((segment) =>
        [
          `${segment.mainSpeaker}: ${segment.timestamp}`,
          segment.transcript,
          "",
        ].join("\n")
      )
      .join("\n");

  const footer = (
    <div>
      <ClipboardButton text={getRawScript} />
      <DownloadButton text={getRawScript} />
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
        <TranscriptionScript
          mediaUrl={dialogState.mediaUrl}
          scriptSegments={dialogState.scriptSegments}
          setTranscript={setTranscript}
        />
      </Dialog>
    </React.Fragment>
  );
};
