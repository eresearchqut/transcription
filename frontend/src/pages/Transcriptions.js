import React, {useState, useEffect, useRef} from 'react';
import {Storage} from 'aws-amplify';
import {TranscriptionService} from '../service/TranscriptionService';
import {DataTable} from 'primereact/datatable';
import {Column} from 'primereact/column';
import {FileUpload} from 'primereact/fileupload';

const TranscriptionList = () => {
    const mockData = [
        {"filename": "Top Gun 2 - Top Gunnier.mp4", "status": "started", "link": "https://www.example.com"},
        {"filename": "Star Trek VII - The Search for eResearch.mp4", "status": "running", "link": "https://www.example.com"},
        {"filename": "TRRiffic.mp4", "status": "finished", "link": "https://www.example.com"},
        {"filename": "Nightmare on Helm street.mp4", "status": "error", "link": "https://www.example.com"},
    ]
    const statusIcons = {
        "started": <span><i className="pi pi-cloud-upload"></i> Started</span>,
        "running": <span><i className="pi pi-spinner"></i> Running</span>,
        "finished": <span><i className="pi pi-check"></i> Finished</span>,
        "error": <span><i className="pi pi-exclamation-triangle"></i> Error</span>,
    }


    const tableData = mockData.map((d) => {
        let link = <i className="pi pi-download"></i>;
        if (d['status'] === "finished") {
            link = <a href={d['link']}>{link}</a>;
        }

        return {
            "filename": d['filename'],
            "status": statusIcons[d['status']],
            "link": link
        }
    })

    return (
        <DataTable value={tableData}>
            <Column field="filename" header="File name"></Column>
            <Column field="status" header="Status"></Column>
            <Column field="link" header="Download link"></Column>
        </DataTable>
    )
}

export const Transcriptions = () => {

    const transcriptionService = new TranscriptionService();
    const [identity, setIdentity] = useState({})

    useEffect(() => {
        let isCancelled = false;
        transcriptionService.getIdentity().then(identity => setIdentity(identity));
        return () => {
            isCancelled = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function onChange(e) {
        const file = e.target.files[0];
        console.log(identity)
        try {
            await Storage.put(`${identity['identityId']}/en-AU/${file.name}`, file, {
                level: 'private',
                progressCallback(progress) {
                    console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
                },

            });


        } catch (error) {
            console.log('Error uploading file: ', error);
        }
    }



    return (
    <React.Fragment>
        <TranscriptionList/>
        <br></br>
        <FileUpload mode="basic" name="demo" url="./upload" chooseLabel="Upload file"></FileUpload>
        <input
            type="file"
            onChange={onChange}
        />
    </React.Fragment>
    );
}
