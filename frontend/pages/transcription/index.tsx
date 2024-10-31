import type { NextPage } from "next";
import { useContext, useState } from "react";
import { withLayout } from "@moxy/next-layout";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Link,
  Progress,
  Text,
  Tag,
  useDisclosure,
  VStack,
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
import supportedLanguages from "@/public/supported_languages.json";
import { get } from "lodash";
import { isDefined } from "@chakra-ui/utils";

const TranscriptionPage: NextPage = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { transcriptions, transcriptionsLoading } = useContext(
    TranscriptionsContext,
  );
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

  const formatFilename = (filename: string) => decodeURIComponent(filename);
  const formatDate = (isoDateString: string) => {
    return new Date(isoDateString).toLocaleString("default");
  };

  const columns: ColumnDef<Transcription>[] = [
    {
      id: "dateUploaded",
      header: "Date Uploaded",
      accessorFn: (transcription) => transcription.date,
      cell: (props) => formatDate(props.row.original.date),
    },
    {
      header: "File Name",
      accessorFn: (transcription) => transcription,
      cell: (props) => {
        const transcription = props.getValue() as Transcription;
        const filename = formatFilename(transcription.metadata.filename);

        return <Text>{filename}</Text>;
      },
    },
    {
      id: "language",
      header: "Language",
      accessorFn: (transcription) => transcription,
      cell: (props) => {
        const transcription = props.getValue() as Transcription;
        const TranscriptionJob =
          transcription?.transcriptionResponse?.TranscriptionJob;
        const transcribedLanguages = [
          TranscriptionJob?.LanguageCode,
          ...(TranscriptionJob?.LanguageCodes?.map(
            (lang) => lang.LanguageCode,
          ) ?? []),
        ]
          .filter((lang) => isDefined(lang))
          .map((lang) => get(supportedLanguages, lang!, lang));
        return transcribedLanguages?.join(",");
      },
    },
    {
      header: "Transcription Status",
      accessorFn: (transcription) => transcription,
      cell: (props) => {
        const transcription = props.getValue() as Transcription;
        const piiRedacted =
          transcription.transcriptionResponse?.TranscriptionJob
            ?.ContentRedaction?.RedactionType;
        return (
          <>
            <JobStatus jobId={transcription.sk} transcription={transcription} />
            {piiRedacted && (
              <>
                {" "}
                <Tag variant={"outline"} colorScheme={"red"}>
                  PII REDACTED
                </Tag>
              </>
            )}
          </>
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
              <DataTable {...tableProps} columns={columns} />
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
