import React, { useState, useEffect, useRef } from 'react';
import { TranscriptionService } from '../service/TranscriptionService';
import { UserService } from '../service/UserService';

import { S3FileUpload } from '../components/S3FileUpload';
import { TranscriptionList } from '../components/TranscriptionList';
import { Toast } from 'primereact/toast';

function useInterval(callback, delay) {
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
        tick()
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}


export const Transcriptions = () => {

    const transcriptionService = new TranscriptionService();
    const userService = new UserService();
    const [user, setUser] = useState({});
    const uploadDir = `${user['identityId']}/en-AU`;
    const [transcriptions, setTranascriptions] = useState([]);
    const toast = useRef(null);

    useEffect(() => {
        userService.getUser().then(result => setUser(result));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useInterval(() => {
        transcriptionService.getTranscriptions().then(result => setTranascriptions(result));
    }, 10000)

    const onUpload = ({ file }) => {
        toast.current.show({ severity: "info", summary: "Success", detail: `${file.name} uploaded` })
    }

    const onError = ({ file, error }) => {
        toast.current.show({ severity: "error", summary: "Failure", detail: `${file.name} failed to upload` })
    }

    return (
        <React.Fragment>
            <Toast ref={toast} />

            <TranscriptionList transcriptions={transcriptions} />
            <br></br>
            <S3FileUpload mode="advanced" uploadDir={uploadDir} customUpload onUpload={onUpload} onError={onError} multiple chooseLabel="Add files" />
        </React.Fragment>
    );
}
