import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TranscriptionDialog } from './TranscriptionDialog';
import { Storage } from 'aws-amplify';

const EXPIRY_SECONDS = 1209600000 // Two weeks

export const TranscriptionList = (props) => {

    const statusIcons = {
        "QUEUED": <span><i className="pi pi-cloud-upload"></i> Queued</span>,
        "IN_PROGRESS": <span><i className="pi pi-spinner"></i> Processing</span>,
        "COMPLETED": <span><i className="pi pi-check"></i> Finished</span>,
        "FAILED": <span><i className="pi pi-exclamation-triangle"></i> Failed</span>,
    }


    const tableData = props.transcriptions.map((t) => {
        const transcriptionStatus = t.jobStatusUpdated?.detail.TranscriptionJobStatus;
        const filename = t.uploadEvent.object.key.split("/").pop()
        const finished = transcriptionStatus === "COMPLETED";
        const expiry = new Intl.DateTimeFormat('en-AU', { dateStyle: 'short', timeStyle: 'short' })
            .format(Date.parse(t.date) + EXPIRY_SECONDS);

        const downloadKey = t.outputKey.replace("public/", "");
        const getData = async () => { return await Storage.get(downloadKey, { download: true }) }
        const getUrl = async () => { return await Storage.get(downloadKey, { download: false }) }

        return {
            pk: t.pk,
            filename: filename,
            link: <TranscriptionDialog disabled={!finished} filename={filename} getData={getData} getUrl={getUrl} />,
            expiry: expiry,
            status: statusIcons[transcriptionStatus] || statusIcons["QUEUED"]
        }
    })

    return (
        <DataTable value={tableData} dataKey="pk">
            <Column field="filename" header="File name"></Column>
            <Column field="status" header="Status"></Column>
            <Column field="expiry" header="Expiry"></Column>
            <Column field="link" header=""></Column>
        </DataTable>
    )
}
