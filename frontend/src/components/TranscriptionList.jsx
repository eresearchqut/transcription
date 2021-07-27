import { Storage } from "aws-amplify";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import { TranscriptionDialog } from "./TranscriptionDialog";

const EXPIRY_SECONDS = 1209600000; // Two weeks

export const TranscriptionList = (props) => {
  const statusIcons = {
    QUEUED: (
      <span>
        <i className="pi pi-cloud-upload"></i> Queued
      </span>
    ),
    IN_PROGRESS: (
      <span>
        <i className="pi pi-spin pi-spinner"></i> Processing
      </span>
    ),
    COMPLETED: (
      <span>
        <i className="pi pi-check"></i> Finished
      </span>
    ),
    FAILED: (
      <span>
        <i className="pi pi-exclamation-triangle"></i> Failed
      </span>
    ),
  };

  const tableData = props.transcriptions
    .map((t) => {
      const transcriptionStatus =
        t.jobStatusUpdated?.detail.TranscriptionJobStatus ||
        t.transcriptionResponse?.TranscriptionJob?.TranscriptionJobStatus;
      const filename = t.metadata?.filename;
      const downloadKey = t.downloadKey;
      const finished = transcriptionStatus === "COMPLETED" && downloadKey;
      const expiry = Date.parse(t.date) + EXPIRY_SECONDS;
      const expiryString = new Intl.DateTimeFormat("en-AU", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(expiry);

      const getData = async () => {
        console.log("getData", downloadKey);
        return await Storage.get(downloadKey, {
          level: "private",
          download: true,
        });
      };
      const getUrl = async () => {
        console.log("getUrl", downloadKey);
        return await Storage.get(downloadKey, {
          level: "private",
          download: false,
        });
      };

      return {
        pk: t.pk,
        filename: filename,
        link: (
          <TranscriptionDialog
            disabled={!finished}
            filename={filename}
            getData={getData}
            getUrl={getUrl}
          />
        ),
        expiry: expiry,
        expiryString: expiryString,
        status: statusIcons[transcriptionStatus] || statusIcons["QUEUED"],
      };
    })
    .sort((a, b) => b.expiry - a.expiry);

  const expirySort = (e) => {
    return tableData.sort(
      e.order === 1
        ? (a, b) => a.expiry - b.expiry
        : (a, b) => b.expiry - a.expiry
    );
  };

  return (
    <DataTable
      value={tableData}
      dataKey="pk"
      paginator
      rows={5}
      rowsPerPageOptions={[5, 10, 25, 100]}
      alwaysShowPaginator={false}
    >
      <Column field="filename" header="File name" sortable></Column>
      <Column field="status" header="Status" sortable></Column>
      <Column
        field="expiryString"
        header="Expiry"
        sortable
        sortFunction={expirySort}
      ></Column>
      <Column field="link" header=""></Column>
    </DataTable>
  );
};
