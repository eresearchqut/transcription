import React, {useState} from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ClipboardButton } from './ClipboardButton';


export const TranscriptionDialog = (props) => {
    const [displayDialog, setDialog] = useState(false);
    const [rawTranscriptionText, setRawTranscriptionText] = useState("");
    const [transcriptionText, setTranscriptionText] = useState(null);

    const displayFullText = async () => {
        const response = await props.getData();
        const data = JSON.parse(await response.Body.text());

        setRawTranscriptionText(data.results.transcripts.map((t) => t.transcript).join(""));
        setTranscriptionText(data.results.transcripts.map((t, i) => <p key={i}>{t.transcript}</p>));
        setDialog(true);
    }


    const footer = (
        <div>
            <ClipboardButton text={rawTranscriptionText} />
        </div>
    );

    return (
        <React.Fragment>
            <Button label="Download" icon="pi pi-external-link" onClick={displayFullText} disabled={props.disabled} />

            <Dialog header={props.filename} visible={displayDialog} style={{ width: '50vw' }} onHide={() => setDialog(false)} footer={footer}>
                {transcriptionText}
            </Dialog>
        </React.Fragment>
    )
}