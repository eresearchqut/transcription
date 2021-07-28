import React, { useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { ClipboardButton } from "./ClipboardButton";
import { TranscriptionScript } from "./script/TranscriptionScript";

export const TranscriptionDialog = (props) => {
  const [dialogDisplayed, setDialogDisplayed] = useState(false);
  const [dialogOutput, setDialogOutput] = useState(null);
  const [rawTranscriptionScript, setRawTranscriptionScript] = useState("");

  const buildDialog = async () => {
    const fileUrl = await props.getUrl();

    const fileContent = await props.getData();
    const data = JSON.parse(await fileContent.Body.text());
    const results = data.results;

    const transcriptionScriptComponent = (
      <TranscriptionScript
        speakerLabels={results.speaker_labels}
        scriptSegments={results.segments}
        getRawText={setRawTranscriptionScript}
      />
    );

    setDialogOutput({
      dataDownloadUrl: fileUrl,
      transcriptionScriptComponent: transcriptionScriptComponent,
    });
  };

  const rawUrl = window.URL.createObjectURL(new Blob([rawTranscriptionScript]));

  const footer = (
    <div>
      <ClipboardButton text={rawTranscriptionScript} />
      <a href={rawUrl} download="transcription.txt">
        <Button label="Download transcription " />
      </a>
      <a href={dialogOutput?.dataDownloadUrl} download="transcription.json">
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
      >
        {dialogOutput?.transcriptionScriptComponent ||
          "Loading transcription..."}
      </Dialog>
    </React.Fragment>
  );
};
