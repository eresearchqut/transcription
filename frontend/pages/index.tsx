import type { NextPage } from "next";
import * as React from "react";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { withLayout } from "@moxy/next-layout";
import Layout from "../components/layout";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  Grid,
  GridItem,
  Heading,
  Hide,
  HStack,
  IconButton,
  Link,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Progress,
  Spacer,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Tr,
  useDisclosure,
  VisuallyHidden,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { useAuth, useLogout } from "../context/auth-context";
import FileUpload from "../components/fileUpload";

import { Storage } from "aws-amplify";
import { v4 as uuid } from "uuid";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import DataTable from "../components/dataTable";
import { Box, Stack } from "@chakra-ui/layout";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import Auth from "@aws-amplify/auth";
import Quotas from "../components/quotas";
import startCase from "lodash/startCase";
import * as srtConvert from "aws-transcription-to-srt";
import { AiOutlinePlaySquare } from "react-icons/ai";
import { MdOutlineSubtitles } from "react-icons/md";
import { VscJson } from "react-icons/vsc";
import { Player } from "../components/player";
import toWebVTT from "srt-webvtt";
import { FiHelpCircle } from "react-icons/fi";
import document, { TranscriptJob } from "../components/document";
import { Packer } from "docx";
import { MediaUpload, TranscribeProps } from "../forms/mediaUpload";

const SUPPORTED_MIME_TYPES = [
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "audio/m4a",
  "audio/x-m4a",
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
];

export interface Transcription {
  pk: string;
  sk: string;
  metadata: {
    filetype: string;
    languagecode: string;
    mimetype: string;
    filename: string;
  };
  date: string;
  downloadKey?: string;
  ttl: number;
  jobStatusUpdated?: {
    detail: {
      TranscriptionJobStatus: string;
      FailureReason?: string;
    };
  };
  transcriptionResponse?: {
    TranscriptionJob?: {
      TranscriptionJobStatus: string;
    };
  };
  uploadEvent: {
    object: {
      size: number;
      key: string;
    };
  };
}

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";
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
  objectKey?: string;
  fileName: string;
  label: string;
}

export const Download: FunctionComponent<DownloadProps> = ({
  objectKey,
  fileName,
  label,
}) => {
  const [href, setHref] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const { handleLogout } = useLogout();

  useEffect(() => {
    if (href) {
      linkRef.current?.click();
    }
  }, [href]);

  const handleDownload = () => {
    if (objectKey) {
      setIsLoading(() => true);
      Auth.currentSession()
        .then(() =>
          Storage.get(objectKey, {
            level: "private",
            contentDisposition: `attachment; filename = ${fileName}`,
          }).then((signedUrl) => setHref(() => signedUrl)),
        )
        .catch((e) => handleLogout())
        .finally(() => setIsLoading(() => false));
    }
  };

  return (
    <>
      <VisuallyHidden>
        <Link href={href} ref={linkRef} isExternal />
      </VisuallyHidden>
      <Button
        leftIcon={
          fileName.endsWith("json") ? <VscJson /> : <ExternalLinkIcon />
        }
        variant="outline"
        isLoading={isLoading}
        onClick={handleDownload}
      >
        {label}
      </Button>
    </>
  );
};

export const transcriptUrl = (
  objectKey: string,
  format: "srt" | "vtt" | "docx",
): Promise<string> => {
  return Auth.currentSession().then(() =>
    Storage.get(objectKey, {
      level: "private",
      download: true,
    })
      .then((output) => (output.Body as Blob).text())
      .then((text) => JSON.parse(text) as TranscriptJob)
      .then((transcriptJob) =>
        format === "docx"
          ? Packer.toBlob(document(transcriptJob))
          : new Blob([srtConvert(transcriptJob)], { type: "text/plain" }),
      )
      .then((blob) =>
        format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
      ),
  );
};

export interface DownloadTranscriptProps extends DownloadProps {
  format?: "srt" | "vtt" | "docx";
}

export const DownloadTranscript: FunctionComponent<DownloadTranscriptProps> = ({
  objectKey,
  fileName,
  label,
  format = "srt",
}) => {
  const [href, setHref] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const { handleLogout } = useLogout();

  useEffect(() => {
    if (href) {
      linkRef.current?.click();
    }
  }, [href]);

  const handleDownload = () => {
    if (objectKey) {
      setIsLoading(() => true);
      transcriptUrl(objectKey, format)
        .then((url) => setHref(url))
        .catch((e) => handleLogout())
        .finally(() => setIsLoading(false));
    }
  };

  return (
    <>
      <VisuallyHidden>
        <Link href={href} ref={linkRef} download={fileName} />
      </VisuallyHidden>
      <Button
        leftIcon={<MdOutlineSubtitles />}
        variant="outline"
        isLoading={isLoading}
        onClick={handleDownload}
      >
        {label}
      </Button>
    </>
  );
};

interface PlayProps {
  mediaUrl: string;
  transcriptUrl: string;
}

const Transcription: NextPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const finalRef = React.useRef(null);

  const [transcriptions, setTranscriptions] = useState<
    Transcription[] | undefined
  >();
  const [play, setPlay] = useState<PlayProps | undefined>(undefined);
  const [expectedCount, setExpectedCount] = useState<number>(0);
  const [pollDelay, setPollDelay] = useState<number | null>(100);
  const { handleLogout } = useLogout();

  const mediaKey = (transcription: Transcription): string =>
    transcription.uploadEvent.object.key.split("/").slice(-2).join("/");

  const loadPlayer = (transcription: Transcription) => {
    if (transcription.downloadKey !== undefined) {
      return Auth.currentSession().then(() =>
        Storage.get(mediaKey(transcription), {
          level: "private",
        })
          .then((mediaUrl) =>
            transcriptUrl(transcription.downloadKey as string, "vtt").then(
              (transcriptUrl) =>
                setPlay(() => ({
                  mediaUrl,
                  transcriptUrl,
                })),
            ),
          )
          .catch((e) => handleLogout())
          .then(() => onOpen()),
      );
    }
  };

  const {
    state: { user },
  } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(
    new Map(),
  );

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatFilename = (filename: string) => decodeURIComponent(filename);

  const status = (transcription: Transcription) =>
    transcription.jobStatusUpdated?.detail.TranscriptionJobStatus ||
    transcription.transcriptionResponse?.TranscriptionJob
      ?.TranscriptionJobStatus ||
    "";

  const formatStatus = (transcription: Transcription) =>
    startCase(status(transcription).toLowerCase());

  const mediaProps = (transcription: Transcription): DownloadProps => ({
    objectKey: mediaKey(transcription),
    label: "Media",
    fileName: transcription.metadata.filename,
  });
  const transcriptionProps = (transcription: Transcription): DownloadProps => ({
    objectKey: transcription.downloadKey,
    label: "JSON",
    fileName: [transcription.metadata.filename.split(".")[0], "json"].join("."),
  });
  const srtProps = (transcription: Transcription): DownloadTranscriptProps => ({
    objectKey: transcription.downloadKey,
    label: "SRT",
    fileName: [transcription.metadata.filename.split(".")[0], "srt"].join("."),
  });
  const vttProps = (transcription: Transcription): DownloadTranscriptProps => ({
    objectKey: transcription.downloadKey,
    label: "VTT",
    fileName: [transcription.metadata.filename.split(".")[0], "vtt"].join("."),
    format: "vtt",
  });
  const docxProps = (
    transcription: Transcription,
  ): DownloadTranscriptProps => ({
    objectKey: transcription.downloadKey,
    label: "DOCX",
    fileName: [transcription.metadata.filename.split(".")[0], "docx"].join("."),
    format: "docx",
  });

  const formatDate = (isoDateString: string) => {
    return new Date(isoDateString).toLocaleString();
  };

  const columns: ColumnDef<Transcription>[] = [
    {
      header: "File Name",
      accessorFn: (transcription) =>
        formatFilename(transcription.metadata.filename),
    },
    {
      id: "dateUploaded",
      header: "Date Uploaded",
      accessorFn: (transcription) => transcription.date,
      cell: (props) => formatDate(props.row.original.date),
    },
    {
      header: "Type",
      accessorFn: (transcription) => transcription.metadata.mimetype,
    },
    {
      header: "Size",
      accessorFn: (transcription) => transcription.uploadEvent.object.size,
      cell: (props) => formatBytes(props.row.original.uploadEvent.object.size),
    },

    {
      header: "Transcription Status",
      accessorFn: (transcription) => status(transcription),
      cell: (props) => (
        <HStack spacing={2}>
          <Text>{formatStatus(props.row.original)}</Text>
          {status(props.row.original) === "IN_PROGRESS" && (
            <Spinner size={"sm"} />
          )}
        </HStack>
      ),
    },
    {
      id: "actions",
      header: "Transcriptions",
      enableSorting: false,
      cell: (props) => {
        const transcription = props.row.original;

        if (transcription.downloadKey) {
          return (
            <Stack direction={["column", "column", "column", "column", "row"]}>
              <Download {...mediaProps(transcription)} />
              <Download {...transcriptionProps(transcription)} />
              <DownloadTranscript {...srtProps(transcription)} />
              <DownloadTranscript {...vttProps(transcription)} />
              <DownloadTranscript {...docxProps(transcription)} />
              <Button
                onClick={() => loadPlayer(transcription)}
                variant={"outline"}
                leftIcon={<AiOutlinePlaySquare />}
              >
                Play
              </Button>
            </Stack>
          );
        }
        if (transcription.jobStatusUpdated?.detail.FailureReason) {
          return (
            <Alert status="error">
              <AlertIcon />
              <Box>
                <AlertDescription>
                  {transcription.jobStatusUpdated?.detail.FailureReason}
                </AlertDescription>
              </Box>
            </Alert>
          );
        }
        return <Download {...mediaProps(transcription)} />;
      },
    },
  ];

  const mobileColumns: ColumnDef<Transcription>[] = [
    {
      id: "dateUploaded",
      header: "Date Uploaded",
      accessorFn: (transcription) => transcription.date,
      cell: (props) => {
        const transcription = props.row.original;
        return (
          <Table>
            <Tbody>
              <Tr>
                <Td colSpan={2}>
                  <Heading as="h4" size={"sm"}>
                    {formatFilename(transcription.metadata.filename)}
                  </Heading>
                </Td>
              </Tr>
              <Tr>
                <Td>Uploaded:</Td>
                <Td>{formatDate(transcription.date)}</Td>
              </Tr>
              <Tr>
                <Td>Type:</Td>
                <Td>{transcription.metadata.mimetype}</Td>
              </Tr>
              <Tr>
                <Td>Size:</Td>
                <Td>{formatBytes(transcription.uploadEvent.object.size)}</Td>
              </Tr>
              <Tr>
                <Td>Status:</Td>
                <Td>{formatStatus(transcription)}</Td>
              </Tr>
              {transcription.jobStatusUpdated?.detail.FailureReason && (
                <Tr>
                  <Td colSpan={2}>
                    <Alert status={"error"}>
                      <AlertIcon />
                      <Box>
                        <AlertDescription>
                          {transcription.jobStatusUpdated?.detail.FailureReason}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </Td>
                </Tr>
              )}
              <Tr>
                <Td colSpan={2}>
                  <Wrap>
                    <Download {...mediaProps(transcription)} />
                    {transcription.downloadKey && (
                      <>
                        <Download {...transcriptionProps(transcription)} />
                        <DownloadTranscript {...srtProps(transcription)} />
                        <DownloadTranscript {...vttProps(transcription)} />
                        <DownloadTranscript {...docxProps(transcription)} />
                        <Button
                          onClick={() => loadPlayer(transcription)}
                          variant={"outline"}
                          leftIcon={<AiOutlinePlaySquare />}
                        >
                          Play
                        </Button>
                      </>
                    )}
                  </Wrap>
                </Td>
              </Tr>
            </Tbody>
          </Table>
        );
      },
    },
  ];

  const initialSortState = {
    sorting: [{ id: "dateUploaded", desc: true }] as SortingState,
  };

  useInterval(() => {
    Auth.currentSession()
      .then((currentSession) => currentSession.getIdToken().getJwtToken())
      .then(
        (idToken) =>
          ({
            Authorization: `Bearer ${idToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          }) as HeadersInit,
      )
      .then((headers) =>
        fetch(`${API_ENDPOINT}/transcription`, {
          headers,
        })
          .then((res) => res.json())
          .then((loaded: Transcription[]) => {
            setExpectedCount((current) =>
              current === 0 ? loaded.length : current,
            );
            setTranscriptions(() => loaded);
          }),
      );
  }, pollDelay);

  useEffect(() => {
    if (transcriptions) {
      const inProgress =
        transcriptions.length < expectedCount ||
        transcriptions.find(
          (transcription) =>
            ["QUEUED", "IN_PROGRESS"].find(
              (queuedOrInProgressStatus) =>
                queuedOrInProgressStatus === status(transcription),
            ) ||
            ("COMPLETED" === status(transcription) &&
              !transcription.downloadKey),
        );
      if (inProgress) {
        setPollDelay(5000);
      } else {
        setPollDelay(null);
      }
    }
  }, [transcriptions, expectedCount]);

  const handelUpload = (file: File) => {
    const id = uuid();
    const key = `${user?.id}/${id}.upload`;
    const metadata = {
      filename: encodeURIComponent(file.name),
      mimetype: file.type,
      filetype: "userUploadedFile",
      languagecode: "en-AU",
    };

    Auth.currentSession()
      .then(() =>
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
            });
          },
        }).then(() => setExpectedCount((current) => current + 1)),
      )
      .catch((e) => handleLogout());
  };

  const uploadFiles = (transcribeProps: TranscribeProps, files: File[]) => {
    const uploadFile = (
      file: File,
      {
        languages,
        hasMultipleLanguages,
        hasIdentifiedAllLanguages,
        enablePiiRedaction,
      }: TranscribeProps,
    ) => {
      const id = uuid();
      const key = `${user?.id}/${id}.upload`;
      const metadata = {
        filename: encodeURIComponent(file.name),
        mimetype: file.type,
        filetype: "userUploadedFile",
        languages: languages.join(","),
        hasIdentifiedAllLanguages: JSON.stringify(hasIdentifiedAllLanguages),
        enablePiiRedaction: JSON.stringify(enablePiiRedaction),
        hasMultipleLanguages: JSON.stringify(hasMultipleLanguages),
      };

      Auth.currentSession()
        .then(() =>
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
              });
            },
          }).then(() => setExpectedCount((current) => current + 1)),
        )
        .catch((e) => handleLogout());
    };

    files.forEach((file) => uploadFile(file, transcribeProps));
  };

  return (
    <>
      <VStack spacing={4} align="stretch">
        <MediaUpload onSubmit={uploadFiles} />
        <Flex minWidth="max-content" alignItems="center" gap="2">
          <Box>
            <Heading size={"md"}>My Transcriptions</Heading>
          </Box>
          <Spacer />
          <Popover>
            <PopoverTrigger>
              <IconButton
                icon={<FiHelpCircle />}
                variant={"outline"}
                aria-label={"Help"}
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverHeader></PopoverHeader>
              <PopoverBody>
                <Heading>Quotas</Heading>
                <Quotas />
              </PopoverBody>
            </PopoverContent>
          </Popover>
          <FileUpload
            handleFile={handelUpload}
            accepted={SUPPORTED_MIME_TYPES}
            label={"Upload Files"}
            multiple={true}
          />
        </Flex>
        {uploadProgress.size > 0 && (
          <>
            <Alert status="info">
              <AlertIcon />
              Please wait while your media uploads. You can select more files
              while you wait.
            </Alert>
            {Array.from(uploadProgress.entries()).map(
              ([fileName, progress], index) => (
                <Grid gridTemplateColumns={"25% 1fr"} gap={4} key={index}>
                  <GridItem>Uploading {fileName}: </GridItem>
                  <GridItem>
                    <Progress hasStripe value={progress * 100} />
                  </GridItem>
                </Grid>
              ),
            )}
          </>
        )}

        {!transcriptions && <Progress isIndeterminate />}

        {transcriptions && transcriptions.length === 0 && (
          <>
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>Getting Started</AlertTitle>
                <AlertDescription>
                  Click the Upload Files button to start the transcription
                  process. Please refer to the following table for guidance on
                  supported file formats, size and duration.
                </AlertDescription>
              </Box>
            </Alert>
            <Quotas />
          </>
        )}
        {transcriptions && transcriptions.length > 0 && (
          <>
            <Hide above="md">
              <DataTable
                data={transcriptions}
                columns={mobileColumns}
                paginate={transcriptions.length > 10}
                tableProps={{ variant: "unstyled" }}
                initialState={initialSortState}
              />
            </Hide>
            <Hide below="md">
              <DataTable
                data={transcriptions}
                columns={columns}
                paginate={transcriptions.length > 10}
                initialState={initialSortState}
              />
            </Hide>
          </>
        )}

        {transcriptions && transcriptions.length < expectedCount && (
          <Alert status="info">
            <AlertIcon />
            <Box>
              <AlertDescription>
                Your media files are being queued for processing. The table
                above will update shortly.
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </VStack>

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={finalRef}
        size={"md"}
      >
        <DrawerOverlay />
        <DrawerContent>
          <Alert status="info">
            <AlertIcon />
            <Box>
              <AlertTitle>Web Player</AlertTitle>
              <AlertDescription>
                Scroll to any point in the transcript and click the dialogue to
                hear the associated audio.
              </AlertDescription>
            </Box>
          </Alert>

          <DrawerBody>
            {play && (
              <Player audio={play.mediaUrl} transcript={play.transcriptUrl} />
            )}
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Close player
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default withLayout(<Layout />)(Transcription);
