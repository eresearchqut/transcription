import type { NextPage } from "next";
import { useContext, useState } from "react";
import { withLayout } from "@moxy/next-layout";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Flex,
  Link,
  Progress,
  Text,
  Tooltip,
  useDisclosure,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import DataTable from "../../components/dataTable";
import { Box } from "@chakra-ui/layout";
import { TranscriptionDownloadOptions } from "../../components/TranscriptionDownloadOptions";
import TranscriptionsListingPageLayout from "../../layout/transcriptionsListingPageLayout";
import { TranscriptionsContext } from "../../context/transcriptions-context";
import { TRANSCRIBE_QUOTAS, Transcription } from "../../model";
import { TranscriptionStatus } from "../../components/transcriptionStatus";
import { MediaPlayerDrawer } from "../../components/mediaPlayerDrawer";
import { MediaPlayerDrawerProps } from "../../components/mediaPlayerDrawer/mediaPlayerDrawer";
import NextLink from "next/link";
import { TbClockExclamation } from "react-icons/tb";
import { add, set } from "date-fns";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/input";
import { SearchIcon } from "@chakra-ui/icons";
import {
  languagesFromTranscription,
  TranscriptionLanguages,
} from "../../components/transcriptionLanguages";

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

  const [filter, setFilter] = useState<string>("");
  const searchInputPlaceholder = "Search transcriptions";

  const formatFilename = (filename: string) => decodeURIComponent(filename);
  const formatDate = (isoDateString: string) => {
    return new Date(isoDateString).toLocaleString("default");
  };
  const startOfDay = (isoDateString: string) =>
    set(isoDateString, { hours: 0, minutes: 0, seconds: 0 });
  const isExpiringSoon = (isoDateString: string) => {
    const estimatedDateExpiry = add(
      startOfDay(isoDateString),
      TRANSCRIBE_QUOTAS.storageDuration,
    );
    const expiringSoonBoundary = add(startOfDay(new Date().toDateString()), {
      days: 3,
    });
    return estimatedDateExpiry < expiringSoonBoundary;
  };

  const columns: ColumnDef<Transcription>[] = [
    {
      id: "dateUploaded",
      header: "Date Uploaded",
      accessorFn: (transcription) => transcription.date,
      cell: (props) => (
        <Wrap>
          <WrapItem>{formatDate(props.row.original.date)}</WrapItem>
          {isExpiringSoon(props.row.original.date) && (
            <WrapItem>
              <Tooltip hasArrow label={"This transcription is expiring soon"}>
                <Text as={"span"} color={"yellow.500"} mt={0.5} tabIndex={0}>
                  <TbClockExclamation />
                </Text>
              </Tooltip>
            </WrapItem>
          )}
        </Wrap>
      ),
    },
    {
      header: "File Name",
      accessorFn: (transcription) => transcription.metadata.filename,
      cell: (props) => {
        const transcription = props.row.original as Transcription;
        const filename = formatFilename(transcription.metadata.filename);

        return <Text>{filename}</Text>;
      },
    },
    {
      id: "language",
      header: "Language",
      accessorFn: (transcription) => languagesFromTranscription(transcription),
      cell: (props) => {
        const transcription = props.row.original as Transcription;
        return (
          <TranscriptionLanguages
            jobId={transcription.sk}
            initialTranscription={transcription}
          />
        );
      },
    },
    {
      header: "Status",
      accessorFn: (transcription) => transcription,
      cell: (props) => {
        const transcription = props.getValue() as Transcription;
        return (
          <TranscriptionStatus
            jobId={transcription.sk}
            initialTranscription={transcription}
          />
        );
      },
    },
    {
      id: "actions",
      header: "Transcription Actions",
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
          <TranscriptionDownloadOptions
            initialTranscription={transcription}
            onPlayClick={onPlayClick}
          />
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
              <Flex>
                <InputGroup variant={"flushed"}>
                  <InputLeftElement>
                    <SearchIcon />
                  </InputLeftElement>
                  <Input
                    value={filter}
                    placeholder={searchInputPlaceholder}
                    onChange={(e) => setFilter(() => e.target.value)}
                    aria-label={searchInputPlaceholder}
                    variant={"outline"}
                  />
                </InputGroup>
              </Flex>
              <DataTable
                {...tableProps}
                columns={columns}
                globalFilter={filter}
              />
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
