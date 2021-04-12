import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ClipboardButton } from './ClipboardButton';


export const TranscriptionDialog = (props) => {
    const [dialogDisplayed, setDialogDisplayed] = useState(false);
    const [rawTranscriptionText, setRawTranscriptionText] = useState("");
    const [transcriptionText, setTranscriptionText] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState("")
    const [dataDownloadUrl, setDataDownloadUrl] = useState("")

    const displayDialog = async () => {
        const fileUrl = await props.getUrl();
        setDataDownloadUrl(fileUrl)

        const fileContent = await props.getData();
        const data = JSON.parse(await fileContent.Body.text());
        const rawText = data.results.transcripts.map((t) => t.transcript).join("");

        setRawTranscriptionText(rawText);
        setTranscriptionText(data.results.transcripts.map((t, i) => <p key={i}>{t.transcript}</p>));

        const rawUrl = window.URL.createObjectURL(new Blob([rawText]))
        setDownloadUrl(rawUrl)

        setDialogDisplayed(true);
    }


    const footer = (
        <div>
            <ClipboardButton text={rawTranscriptionText} />
            <a href={downloadUrl} download="transcription.txt"><Button label="Download transcription " /></a>
            <a href={dataDownloadUrl} download="transcription.json"><Button label="Download transcription data" /></a>
        </div>
    );

    return (
        <React.Fragment>
            <Button label="Download" icon="pi pi-external-link" onClick={displayDialog} disabled={props.disabled} />

            <Dialog header={props.filename} visible={dialogDisplayed} style={{ width: '50vw' }} onHide={() => setDialogDisplayed(false)} footer={footer}>
                {transcriptionText}
            </Dialog>
        </React.Fragment>
    )
}