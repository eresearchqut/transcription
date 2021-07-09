import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";

import { Auth } from "aws-amplify";
import { BreadCrumb } from "primereact/breadcrumb";
import { Card } from "primereact/card";
import { Toast } from "primereact/toast";

import { S3FileUpload } from "../components/S3FileUpload";
import { TranscriptionList } from "../components/TranscriptionList";
import { TranscriptionService } from "../service/TranscriptionService";
import { UserService } from "../service/UserService";

const FILE_UPLOAD_MIME_TYPES = [
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "audio/m4a",
  "application/ogg",
  "audio/ogg",
  "video/ogg",
  "video/webm",
  "audio/webm",
  "audio/amr",
  "audio/3gpp",
  "audio/3gpp2",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/wav",
  "audio/wave",
  "audio/x-pn-wav",
].join(",");

export const Transcriptions = () => {
  const transcriptionService = new TranscriptionService();
  const applicationName = process.env.REACT_APP_APPLICATION_NAME;
  const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
      function tick() {
        savedCallback.current();
      }

      if (delay !== null) {
        let id = setInterval(tick, delay);
        return () => clearInterval(id);
      }
    }, [delay]);
  };

  const [user, setUser] = useState(null);
  const [transcriptions, setTranscriptions] = useState([]);

  const uploadDir = user ? `${user["identityId"]}/en-AU` : null;
  const toast = useRef(null);

  useEffect(async () => {
    if (!user) {
      const userService = new UserService();
      setUser(await userService.getUser());
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const transcriptions = await transcriptionService.getTranscriptions();
      setTranscriptions(transcriptions);
    };
    fetchData().then((r) => {
      console.log("Transcriptions");
    });
  }, []);

  useInterval(async () => {
    const transcriptions = await transcriptionService.getTranscriptions();
    setTranscriptions(transcriptions);
  }, 30000);

  const onUpload = ({ file }) => {
    toast.current.show({
      severity: "info",
      summary: "Success",
      detail: `${file.name} uploaded`,
    });
  };

  const onError = ({ file, _ }) => {
    toast.current.show({
      severity: "error",
      summary: "Failure",
      detail: `${file.name} failed to upload`,
    });
  };

  const pageTitle = "My Transcriptions";
  const title = `${pageTitle} | ${applicationName}`;

  const home = { icon: "pi pi-home", url: "/" };
  const breadcrumbs = [
    {
      label: pageTitle,
      command: () =>
        Auth.federatedSignIn({ provider: process.env.REACT_APP_AUTH_PROVIDER }),
    },
  ];

  return (
    <React.Fragment>
      <Toast ref={toast} />
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <BreadCrumb model={breadcrumbs} home={home} />
      <Card title={pageTitle}>
        <S3FileUpload
          mode="advanced"
          uploadDir={uploadDir}
          customUpload
          onUpload={onUpload}
          onError={onError}
          multiple
          chooseLabel="Select files"
          accept={FILE_UPLOAD_MIME_TYPES}
          emptyTemplate={
            <p className="p-m-0">Drag and drop files here to upload.</p>
          }
        />
        <TranscriptionList transcriptions={transcriptions} />
      </Card>
    </React.Fragment>
  );
};
