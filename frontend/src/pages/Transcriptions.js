import React, {useState, useEffect, useRef} from 'react';
import {Storage} from 'aws-amplify';

export const Transcriptions = () => {

    useEffect(() => {
        let isCancelled = false;
        return () => {
            isCancelled = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function onChange(e) {
        const file = e.target.files[0];
        try {
            await Storage.put(file.name, file, {
                // contentType: 'image/png' // contentType is optional
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
