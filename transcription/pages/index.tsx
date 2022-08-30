import type {NextPage} from 'next'
import * as React from "react"
import {useEffect, useState} from "react"
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Flex,
    Heading,
    Link,
    Progress,
    Spacer,
    Text, VStack
} from "@chakra-ui/react";
import {useAuth} from "../context/auth-context";
import FileUpload from "../components/fileUpload";

import {Storage} from "aws-amplify";
import {v4 as uuid} from "uuid";
import {ColumnDef} from "@tanstack/react-table";
import DataTable from "../components/dataTable";
import {Box, Stack} from "@chakra-ui/layout";
import {ExternalLinkIcon} from "@chakra-ui/icons";
import Auth from "@aws-amplify/auth";
import Quotas from "../components/quotas";


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
    date: string;
    downloadKey?: string;
    ttl: number;
    jobStatusUpdated?: {
        detail: {
            TranscriptionJobStatus: string
        }
    },
    transcriptionResponse?: {
        TranscriptionJob?: {
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
    const [transcriptionsLoading, setTranscriptionsLoading] = useState<boolean>(true);
    const {state: {user}} = useAuth();
    const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    const status = (transcription: Transcription) =>
        transcription.jobStatusUpdated?.detail.TranscriptionJobStatus ||
        transcription.transcriptionResponse?.TranscriptionJob?.TranscriptionJobStatus;

    const formatDate = (isoDateString: string) => {
        return new Date(isoDateString).toLocaleString()
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
            return <Link href={href} isExternal>{transcription.metadata.filename} <ExternalLinkIcon ml={'2px'}
                                                                                                    boxSize={'0.8em'}/></Link>
        }
        return <Text>{transcription.metadata.filename}</Text>;
    };

    const transcriptionLink = (transcription: Transcription) => {
        const [href, setHref] = useState<string | undefined>(undefined);
        useEffect(() => {
            if (transcription.downloadKey) {
                Storage.get(transcription.downloadKey, {
                    level: 'private',
                    contentDisposition: `attachment; filename = transcription-${transcription.metadata.filename}.json`
                }).then((signedUrl) => setHref(signedUrl))
            }
        }, [transcription]);
        if (href) {
            return <Link href={href} isExternal>Download Transcription <ExternalLinkIcon ml={'2px'} boxSize={'0.8em'}/></Link>
        }
        return <Text>{transcription.metadata.filename}</Text>;
    };

    const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

    const columns: ColumnDef<Transcription>[] = [
        {
            header: "Media",
            accessorFn: (transcription) => transcription.metadata.filename,
            cell: (props) => mediaLink(props.row.original)
        },
        {
            header: "Type",
            accessorFn: (transcription) => transcription.metadata.mimetype
        },
        {
            header: "Size",
            accessorFn: (transcription) => transcription.uploadEvent.object.size,
            cell: (props) => formatBytes(props.row.original.uploadEvent.object.size)
        },
        {
            header: "Date Uploaded",
            accessorFn: (transcription) => transcription.date,
            cell: (props) => formatDate(props.row.original.date)
        },
        {
            header: "Transcription",
            enableSorting: false,
            cell: (props) => transcriptionLink(props.row.original)
        }
    ]

    useEffect(() => {
        Auth.currentSession()
            .then((currentSession) => currentSession.getIdToken().getJwtToken())
            .then(
                (idToken) =>
                    ({
                        Authorization: `Bearer ${idToken}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    } as HeadersInit)
            )
            .then((headers) => fetch(`${endpoint}/transcription`, {
                headers
            })
                .then((res) => res.json())
                .then((response) => setTranscriptions(() => response)))
            .then(() => setTranscriptionsLoading(false));
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

    if (transcriptionsLoading) {
        return <>
            <Progress size='xs' isIndeterminate/>
            <Alert status='info'>
                <AlertIcon/>
                Please wait while we load your transcriptions.
            </Alert>
        </>
    }


    return (
        <VStack spacing={4}   align='stretch'>
            <Flex minWidth='max-content' alignItems='center' gap='2' >
                <Box>
                    <Heading size={"md"}>My Transcriptions</Heading>
                </Box>
                <Spacer/>
                <FileUpload handleFile={handelUpload} accepted={SUPPORTED_MIME_TYPES} label={'Uploads Files'}/>
            </Flex>
            {transcriptions.length === 0 &&
                <>
                    <Alert status='info'  >
                        <AlertIcon/>
                        <Box>
                            <AlertTitle>Getting Started</AlertTitle>
                            <AlertDescription>
                                Click the Upload Files button to start the transcription process. Please refer to the
                                following table for guidance on supported file formats, size and duration.
                            </AlertDescription>
                        </Box>
                    </Alert>
                    <Quotas/>
                </>
            }
            {transcriptions.length > 0 &&
                <DataTable data={transcriptions} columns={columns} paginate={false}/>
            }
        </VStack>

    )
}

export default withLayout(<Layout/>)(Home);
