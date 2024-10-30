import type { NextPage } from "next";
import * as React from "react";
import { useContext, useState } from "react";
import { withLayout } from "@moxy/next-layout";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Heading,
  Hide,
  Link,
  Progress,
  Table,
  Tbody,
  Td,
  Tr,
  useDisclosure,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import DataTable from "../../components/dataTable";
import { Box } from "@chakra-ui/layout";
import { Download } from "../../components/download";
import TranscriptionsListingPageLayout from "../../layout/transcriptionsListingPageLayout";
import { TranscriptionsContext } from "../../context/transcriptions-context";
import { Transcription } from "../../model";
import { JobStatus } from "../../components/jobStatus";
import { MediaPlayerDrawer } from "../../components/mediaPlayerDrawer";
import { MediaPlayerDrawerProps } from "../../components/mediaPlayerDrawer/mediaPlayerDrawer";
import NextLink from "next/link";

interface PlayProps {
  mediaUrl: string;
  transcriptUrl: string;
}

const TranscriptionPage: NextPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { transcriptions, transcriptionsLoading } = useContext(
    TranscriptionsContext,
  );
  const finalRef = React.useRef(null);

  const [play, setPlay] = useState<
    Pick<MediaPlayerDrawerProps, "mediaUrl" | "transcriptUrl">
  >({} as MediaPlayerDrawerProps);
  const onPlayClick = (mediaUrl: string, transcriptUrl: string) => {
    setPlay({
      mediaUrl,
      transcriptUrl,
    });
    onOpen();
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatFilename = (filename: string) => decodeURIComponent(filename);

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
      accessorFn: (transcription) => transcription,
      cell: (props) => {
        const transcription = props.getValue() as Transcription;
        return (
          <JobStatus jobId={transcription.sk} transcription={transcription} />
        );
      },
    },
    {
      id: "actions",
      header: "Transcriptions",
      enableSorting: false,
      cell: (props) => {
        const transcription = props.row.original;

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

        return (
          <Download transcription={transcription} onPlayClick={onPlayClick} />
        );
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
                <Td>
                  <JobStatus
                    jobId={transcription.sk}
                    transcription={transcription}
                  />
                </Td>
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
                    <Download
                      transcription={transcription}
                      onPlayClick={onPlayClick}
                    />
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

  const tableProps = {
    data: transcriptions,
    columns,
    paginate: transcriptions.length > 10,
    initialState: initialSortState,
  };

  return (
    <>
      <VStack spacing={4} align="stretch">
        {transcriptionsLoading && <Progress isIndeterminate />}

        {!transcriptionsLoading &&
          transcriptions &&
          transcriptions.length === 0 && (
            <>
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Getting Started</AlertTitle>
                  <AlertDescription>
                    <Link as={NextLink} href={"/transcription/upload"}>
                      Upload Media
                    </Link>{" "}
                    to start the transcription process.
                  </AlertDescription>
                </Box>
              </Alert>
            </>
          )}
        {!transcriptionsLoading &&
          transcriptions &&
          transcriptions.length > 0 && (
            <>
              <Hide above="md">
                <DataTable
                  {...tableProps}
                  columns={mobileColumns}
                  tableProps={{ variant: "unstyled" }}
                />
              </Hide>
              <Hide below="md">
                <DataTable {...tableProps} columns={columns} />
              </Hide>
            </>
          )}
      </VStack>

      <MediaPlayerDrawer
        mediaUrl={play?.mediaUrl}
        transcriptUrl={play?.transcriptUrl}
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  );
};

export default withLayout(TranscriptionsListingPageLayout)(TranscriptionPage);
