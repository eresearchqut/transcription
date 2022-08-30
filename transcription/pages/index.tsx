import type {NextPage} from 'next'
import * as React from "react"
import {useEffect, useState} from "react"
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'
import {Flex, Heading, Link, Spacer, Text} from "@chakra-ui/react";
import {getAuthHeader, useAuth} from "../context/auth-context";
import FileUpload from "../components/fileUpload";

import {Storage} from "aws-amplify";
import {v4 as uuid} from "uuid";
import {ColumnDef} from "@tanstack/react-table";
import DataTable from "../components/dataTable";
import {Box} from "@chakra-ui/layout";

const SUPPORTED_MIME_TYPES = [
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
    "audio/x-wav",
    "audio/vnd.wave",
    "audio/wav",
    "audio/wave",
    "audio/x-pn-wav",
]


export interface Transcription {
    pk: string;
    sk: string;
    metadata: {
        filetype: string;
        languagecode: string;
        mimetype: string;
        filename: string;
    },
    data: string;
    downloadKey: string;
    ttl: number;
    jobStatusUpdated: {
        detail: {
            TranscriptionJobStatus: string
        }
    },
    uploadEvent: {
        object: {
            size: number;
            key: string;
        }
    }
}


const Home: NextPage = () => {

    const [transcriptions, setTranscriptions] = useState<any[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
    const {state: {user}} = useAuth();

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    const mediaLink = (transcription: Transcription) => {
        const [href, setHref] = useState<string | undefined>(undefined);
        useEffect(() => {
            const fileLocation = transcription.uploadEvent.object.key.split('/').slice(-2).join('/');
            Storage.get(fileLocation, {
                level: 'private',
                contentDisposition: `attachment; filename = ${transcription.metadata.filename}`
            }).then((signedUrl) => setHref(signedUrl))
        }, [transcription]);
        if (href) {
            return <Link href={href} isExternal>{transcription.metadata.filename}</Link>
        }
        return <Text>{transcription.metadata.filename}</Text>;
    };

    const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

    const columns: ColumnDef<Transcription>[] = [
        {
            header: "File Name",
            accessorFn: (transcription) => transcription.metadata.filename,
            cell: (props) => mediaLink(props.row.original)
        },
        {
            header: "Type",
            accessorFn: (transcription) => transcription.metadata.mimetype
        },
        {
            header: "Size",
            accessorFn: (transcription) => formatBytes(transcription.uploadEvent.object.size)
        }
    ]

    useEffect(() => {
        const load = async () => {
            await
                fetch(`${endpoint}/transcription`, {
                    headers: getAuthHeader(),
                })
                    .then((res) => res.json())
                    .then((response) => setTranscriptions(() => response))

        };
        load().then();
    }, [])

    useEffect(() => {
        console.log(transcriptions);
    }, [transcriptions])

    const handelUpload = (file: File) => {

        const key = `${user?.id}/${uuid()}.upload`;
        const metadata = {
            filename: encodeURIComponent(file.name),
            mimetype: file.type,
            filetype: "userUploadedFile",
            languagecode: "en-AU",
        };

        Storage.put(key, file, {
            level: "private",
            metadata,
            progressCallback: (progress) => {
                setUploadProgress((current) => {
                    const update = new Map(current);
                    //console.log(progress);
                    update.set(key, progress.loaded);
                    return update;
                })
            },
        }).then();
    }


    return (
        <>
            <Flex minWidth='max-content' alignItems='center' gap='2' m={4}>
                <Box p='2'>
                    <Heading size={"md"}>My Transcriptions</Heading>
                </Box>
                <Spacer/>
                <FileUpload handleFile={handelUpload} accepted={SUPPORTED_MIME_TYPES} label={'Uploads Files'}/>
            </Flex>

            <DataTable data={transcriptions} columns={columns} paginate={false}/>
        </>

    )
}

export default withLayout(<Layout/>)(Home);
