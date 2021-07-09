import React, { useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { ClipboardButton } from "./ClipboardButton";
import { TranscriptionScript } from "./script/TranscriptionScript";

export const TranscriptionDialog = (props) => {
  const [dialogDisplayed, setDialogDisplayed] = useState(false);
  const [transcriptionScript, setTranscriptionScript] = useState(null);
  const [rawTranscriptionScript, setRawTranscriptionScript] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [dataDownloadUrl, setDataDownloadUrl] = useState("");

  const displayDialog = async () => {
    const fileUrl = await props.getUrl();
    setDataDownloadUrl(fileUrl);

    const fileContent = await props.getData();
    const data = JSON.parse(await fileContent.Body.text());
    const results = data.results;

    const transcriptionScript = (
      <TranscriptionScript
        speakerLabels={results.speaker_labels}
        scriptSegments={results.segments}
        getRawText={setRawTranscriptionScript}
      />
    );

    setTranscriptionScript(transcriptionScript);

    const rawUrl = window.URL.createObjectURL(
      new Blob([transcriptionScript.innerHTML])
    );
    setDownloadUrl(rawUrl);

    setDialogDisplayed(true);
  };

  const footer = (
    <div>
      <ClipboardButton text={rawTranscriptionScript} />
      <a href={downloadUrl} download="transcription.txt">
        <Button label="Download transcription " />
      </a>
      <a href={dataDownloadUrl} download="transcription.json">
        <Button label="Download transcription data" />
      </a>
    </div>
  );

  return (
    <React.Fragment>
      <Button
        label="Download"
        icon="pi pi-external-link"
        onClick={displayDialog}
        disabled={props.disabled}
      />

      <Dialog
        header={props.filename}
        visible={dialogDisplayed}
        style={{ width: "50vw" }}
        onHide={() => setDialogDisplayed(false)}
        footer={footer}
      >
        {transcriptionScript}
      </Dialog>
    </React.Fragment>
  );
};
