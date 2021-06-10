import React, {useState, useEffect, useRef} from 'react';
import {TranscriptionService} from '../service/TranscriptionService';
import {UserService} from '../service/UserService';

import {S3FileUpload} from '../components/S3FileUpload';
import {TranscriptionList} from '../components/TranscriptionList';
import {Toast} from 'primereact/toast';

import {Card} from "primereact/card";
import {BreadCrumb} from "primereact/breadcrumb";
import {Auth} from "aws-amplify";
import {Helmet} from "react-helmet";


export const Transcriptions = () => {

    const userService = new UserService();
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
    }


    const [user, setUser] = useState({});
    const [transcriptions, setTranscriptions] = useState([]);

    const uploadDir = `${user['identityId']}/en-AU`;
    const toast = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            const user = await userService.getUser();
            setUser(user);
            const transcriptions = await transcriptionService.getTranscriptions();
            setTranscriptions(transcriptions);
        }
        fetchData().then(r => {
            console.log("Retrieved user and transcriptions")
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    useInterval(async () => {
        const transcriptions = await transcriptionService.getTranscriptions();
        setTranscriptions(transcriptions);
    }, 30000)


    const onUpload = ({file}) => {
        toast.current.show({severity: "info", summary: "Success", detail: `${file.name} uploaded`})
    }

    const onError = ({file, error}) => {
        toast.current.show({severity: "error", summary: "Failure", detail: `${file.name} failed to upload`})
    }

    const pageTitle = 'My Transcriptions'
    const title = `${pageTitle} | ${applicationName}`;

    const home = {icon: "pi pi-home", url: "/"}
    const breadcrumbs = [{
        label: pageTitle,
        command: () => Auth.federatedSignIn({provider: process.env.REACT_APP_AUTH_PROVIDER})
    }];

    return (

        <React.Fragment>
            <Toast ref={toast}/>
            <Helmet>
                <title>{title}</title>
            </Helmet>
            <BreadCrumb model={breadcrumbs} home={home}/>
            <Card title={pageTitle}>
                <S3FileUpload mode="advanced" uploadDir={uploadDir} customUpload onUpload={onUpload} onError={onError}
                              multiple chooseLabel="Select files"
                              accept="audio/flac,audio/mpeg,audio/mp4,video/mp4,audio/m4a,application/ogg,audio/ogg,video/ogg,video/webm,audio/webm,audio/amr,audio/3gpp,audio/3gpp2,audio/x-wav,audio/vnd.wave,audio/wav,audio/wave,audio/x-pn-wav"
                              emptyTemplate={<p className="p-m-0">Drag and drop files here to upload.</p>}
                              />
                <TranscriptionList transcriptions={transcriptions}/>
            </Card>
        </React.Fragment>

    );
}
