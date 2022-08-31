import type {NextPage} from 'next'
import * as React from "react"
import {FunctionComponent, useEffect, useRef, useState} from "react"
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Button,
    Flex,
    Grid,
    GridItem,
    Heading,
    Link,
    Progress,
    Spacer,
    VisuallyHidden,
    VStack
} from "@chakra-ui/react";
import {useAuth} from "../context/auth-context";
import FileUpload from "../components/fileUpload";

import {Storage} from "aws-amplify";
import {v4 as uuid} from "uuid";
import {ColumnDef} from "@tanstack/react-table";
import DataTable from "../components/dataTable";
import {Box} from "@chakra-ui/layout";
import {ExternalLinkIcon} from "@chakra-ui/icons";
import Auth from "@aws-amplify/auth";
import Quotas from "../components/quotas";
import startCase from "lodash/startCase";
import * as srtConvert from "aws-transcription-to-srt";

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
            TranscriptionJobStatus: string,
            FailureReason?: string,
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

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";
type Delay = number | null;
type TimerHandler = (...args: any[]) => void;

const useInterval = (callback: TimerHandler, delay: Delay) => {
    const savedCallbackRef = useRef<TimerHandler>();

    useEffect(() => {
        savedCallbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const handler = (...args: any[]) => savedCallbackRef.current!(...args);
        if (delay !== null) {
            const intervalId = setInterval(handler, delay);
            return () => clearInterval(intervalId);
        }
    }, [delay]);
};


export interface DownloadProps {
    objectKey: string;
    fileName: string;
    label: string;
}

export const Download: FunctionComponent<DownloadProps> = ({objectKey, fileName, label}) => {

    const [href, setHref] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const linkRef = useRef<HTMLAnchorElement | null>(null);

    useEffect(() => {
        if (href) {
            linkRef.current?.click();
        }
    }, [href]);

    const handleDownload = () => {
        setIsLoading(() => true);
        Storage.get(objectKey, {
            level: 'private',
            contentDisposition: `attachment; filename = ${fileName}`
        })
            .then((signedUrl) => setHref(() => signedUrl))
            .finally(() => setIsLoading(() => false))
    }

    return <>
        <VisuallyHidden>
            <Link href={href} ref={linkRef} isExternal/>
        </VisuallyHidden>
        <Button rightIcon={<ExternalLinkIcon/>} colorScheme='teal' variant='link' isLoading={isLoading}
                onClick={handleDownload}>{label}</Button>
    </>

}

export const DownloadSrt: FunctionComponent<DownloadProps> = ({objectKey, fileName, label}) => {


    const [href, setHref] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const linkRef = useRef<HTMLAnchorElement | null>(null);

    useEffect(() => {
        if (href) {
            linkRef.current?.click();
        }
    }, [href]);

    const handleDownload = () => {
        setIsLoading(() => true);
        Storage.get(objectKey, {
            level: 'private',
            download: true,
        })
            .then((output) => (output.Body as Blob).text())
            .then((text) => JSON.parse(text))
            .then((json) => srtConvert(json))
            .then((srt) => new Blob([srt], {type: "text/plain"}))
            .then((blob) => URL.createObjectURL(blob))
            .then((url) => setHref(url))
            .finally(() => setIsLoading(false));
    }

    return <>
        <VisuallyHidden>
            <Link href={href} ref={linkRef} download={fileName}/>
        </VisuallyHidden>
        <Button rightIcon={<ExternalLinkIcon/>} colorScheme='teal' variant='link' isLoading={isLoading}
                onClick={handleDownload}>{label}</Button>
    </>

}


const Home: NextPage = () => {

    const [transcriptions, setTranscriptions] = useState<any[]>([]);
    const [transcriptionsUploading, setTranscriptionsUploading] = useState<boolean>(true);
    const [pollDelay, setPollDelay] = useState<number | null>(null);

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
        transcription.transcriptionResponse?.TranscriptionJob?.TranscriptionJobStatus || ''

    const formatStatus = (transcription: Transcription) => startCase(status(transcription).toLowerCase());

    const formatDate = (isoDateString: string) => {
        return new Date(isoDateString).toLocaleString()
    }

    const columns: ColumnDef<Transcription>[] = [
        {
            header: "Media",
            accessorFn: (transcription) => transcription.metadata.filename,
            cell: (props) => {
                const transcription = props.row.original;
                const downloadProps: DownloadProps = {
                    objectKey: transcription.uploadEvent.object.key.split("/").slice(-2).join("/"),
                    label: transcription.metadata.filename,
                    fileName: transcription.metadata.filename
                }
                return <Download {...downloadProps}/>
            }
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
            header: "Transcription Status",
            accessorFn: (transcription) => status(transcription),
            cell: (props) => formatStatus(props.row.original)
        },
        {
            header: "Transcription (JSON)",
            enableSorting: false,
            cell: (props) => {
                const transcription = props.row.original;
                if (transcription.downloadKey) {
                    const downloadProps: DownloadProps = {
                        objectKey: transcription.downloadKey,
                        label: 'Download Transcription',
                        fileName: [transcription.metadata.filename.split(".")[0], 'json'].join('.')
                    }
                    return <Download {...downloadProps}/>
                }
                return transcription.jobStatusUpdated?.detail.FailureReason || null;
            }
        },
        {
            header: "Subtitle (SRT)",
            enableSorting: false,
            cell: (props) => {
                const transcription = props.row.original;
                if (transcription.downloadKey) {
                    const srtProps: DownloadProps = {
                        objectKey: transcription.downloadKey,
                        label: 'Download Subtitles',
                        fileName: [transcription.metadata.filename.split(".")[0], 'srt'].join('.')
                    }
                    return <DownloadSrt {...srtProps}/>
                }
                return null;
            }
        }
    ]

    useInterval(() => {
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
            .then((headers) => fetch(`${API_ENDPOINT}/transcription`, {
                headers
            })
                .then((res) => res.json())
                .then((response) => setTranscriptions(() => response)))
    }, pollDelay);

    useEffect(() => {
        const inProgress = transcriptions.find((transcription) => ['QUEUED', 'IN_PROGRESS']
                .find((queuedOrInProgressStatus) => queuedOrInProgressStatus === status(transcription))
            || ('COMPLETED' === status(transcription) && !transcription.downloadKey));
        if (inProgress) {
            setPollDelay(10000);
        } else {
            setPollDelay(null);
        }
    }, [transcriptions]);

    useEffect(() => {
        console.log(uploadProgress.size)
        if (uploadProgress.size > 0) {
            setTranscriptionsUploading(() => true);
        } else {
            setTranscriptionsUploading(() => false);
            setPollDelay(500);
        }
    }, [uploadProgress]);

    const handelUpload = (file: File) => {

        const id = uuid();
        const key = `${user?.id}/${id}.upload`;
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
                    const progressPercent = progress.loaded / progress.total;
                    if (progressPercent >= 1) {
                        update.delete(file.name);
                    } else {
                        update.set(file.name, progressPercent);
                    }
                    return update;
                })
            },
        }).then();
    }


    return (
        <VStack spacing={4} align='stretch'>
            <Flex minWidth='max-content' alignItems='center' gap='2'>
                <Box>
                    <Heading size={"md"}>My Transcriptions</Heading>
                </Box>
                <Spacer/>
                <FileUpload handleFile={handelUpload} accepted={SUPPORTED_MIME_TYPES} label={'Uploads Files'}
                            multiple={true}/>
            </Flex>
            {transcriptionsUploading &&
                <>
                    <Alert status='info'>
                        <AlertIcon/>
                        Please wait while your media uploads. You can select more files while you wait.
                    </Alert>
                    {Array.from(uploadProgress.entries()).map(([fileName, progress], index) =>
                        <Grid
                            gridTemplateColumns={'25% 1fr'} gap={4} key={index}>
                            <GridItem>Uploading {fileName}: </GridItem>
                            <GridItem><Progress hasStripe value={progress * 100}/></GridItem>
                        </Grid>
                    )}
                </>
            }

            {!transcriptionsUploading && transcriptions.length === 0 &&
                <>
                    <Alert status='info'>
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
            {!transcriptionsUploading && transcriptions.length > 0 &&
                <DataTable data={transcriptions} columns={columns} paginate={transcriptions.length > 10}/>
            }
        </VStack>

    )
}

export default withLayout(<Layout/>)(Home);
