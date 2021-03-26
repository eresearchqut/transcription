import React, {useState, useEffect, useRef} from 'react';
import {Storage} from 'aws-amplify';
import {TranscriptionService} from '../service/TranscriptionService';

export const Transcriptions = () => {

    const transcriptionService = new TranscriptionService();
    const [identity, setIdentity] = useState({})

    useEffect(() => {
        let isCancelled = false;
        transcriptionService.getIdentity().then(identity => setIdentity);
        return () => {
            isCancelled = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function onChange(e) {
        const file = e.target.files[0];
        try {
            await Storage.put(`upload/${identity['identityId']}/en-AU/${file.name}`, file, {

            });
        } catch (error) {
            console.log('Error uploading file: ', error);
        }
    }

    return (<input
        type="file"
        onChange={onChange}
    />);
}
