import { useContext, useState } from "react";
import {
  AlertIndicator,
  AlertRoot,
  AlertTitle,
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import DataTable from "@/components/dataTable";
import { TranscriptionDownloadOptions } from "@/components/transcriptionDownloadOptions";
import { TRANSCRIBE_QUOTAS, Transcription } from "model";
import { TranscriptionStatus } from "@/components/transcriptionStatus";
import { MediaPlayerDrawer } from "@/components/mediaPlayerDrawer";
import { MediaPlayerDrawerProps } from "@/components/mediaPlayerDrawer/mediaPlayerDrawer";
import NextLink from "next/link";
import { add, set } from "date-fns";
import {
  languagesFromTranscription,
  TranscriptionLanguages,
} from "@/components/transcriptionLanguages";
import { OpenChangeDetails } from "@zag-js/dialog";
import { MappedIcon } from "@/components/mappedIcon";
import { Alert } from "@/components/ui/alert";
import { ProgressBar, ProgressRoot } from "@/components/ui/progress";
import { InputGroup } from "@/components/ui/input-group";
import { NextPageWithLayout } from "@/pages/_app";
import {
  TranscriptionsContext,
  TranscriptionsContextProvider,
} from "../context/transcriptions-context";
import { ToggleTip } from "@/components/ui/toggle-tip";
import { TranscriptionSummary } from "@/components/transcriptionSummary";
import AuthenticatedLayout from "../layout/authenticatedLayout";
import { decodeFilename } from "../utils/filename";

const Transcriptions: NextPageWithLayout = () => {
  const [open, setOpen] = useState(false);
  const { transcriptions, transcriptionsLoading } = useContext(
    TranscriptionsContext,
  );
  const [play, setPlay] = useState<
    Pick<
      MediaPlayerDrawerProps,
      "mediaUrl" | "transcriptUrl" | "summary" | "languages" | "speakers"
    >
  >({} as MediaPlayerDrawerProps);
  const handlePlayClick = (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
    languages?: (string | undefined)[],
    speakers?: string[],
  ) => {
    setPlay({
      mediaUrl,
      transcriptUrl,
      summary,
      languages,
      speakers,
    });
    setOpen(true);
  };
  const onMediaPlayerOpenChange = (e: OpenChangeDetails) => {
    setOpen(e.open);
  };

  const [filter, setFilter] = useState<string>("");
  const searchInputPlaceholder = "Search transcriptions";

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
  const fitColumn = {
    cellProps: { w: "1%", whiteSpace: "nowrap" },
    headerProps: { w: "1%", whiteSpace: "nowrap" },
  };

  const columns: ColumnDef<Transcription>[] = [
    {
      id: "dateUploaded",
      header: "Date Uploaded",
      accessorFn: (transcription) => transcription.date,
      meta: fitColumn,
      cell: (props) => {
        const ttl = new Date(props.row.original.ttl * 1000);
        const formattedTtl = formatDate(ttl.toISOString());
        return (
          <HStack wrap={"nowrap"}>
            <Flex align={"flex-start"} whiteSpace={"nowrap"}>
              {formatDate(props.row.original.date)}
            </Flex>
            {isExpiringSoon(props.row.original.date) && (
              <Flex align={"flex-start"}>
                <ToggleTip
                  content={`This transcription is expiring and will no longer be available to download after ${formattedTtl}.`}
                >
                  <IconButton size={"xs"} rounded={"full"} variant={"ghost"}>
                    <MappedIcon
                      icon={"clock-exclamation"}
                      aria-label={"Expiring soon"}
                      color={"yellow.500"}
                    />
                  </IconButton>
                </ToggleTip>
              </Flex>
            )}
          </HStack>
        );
      },
    },
    {
      header: "File Name",
      accessorFn: (transcription) => transcription.metadata.filename,
      meta: {
        cellProps: { whiteSpace: "normal", w: "auto" },
        headerProps: { whiteSpace: "nowrap", w: "auto" },
      },
      cell: (props) => {
        const transcription = props.row.original as Transcription;
        const filename = decodeFilename(transcription.metadata.filename);

        return <Text>{filename}</Text>;
      },
    },
    {
      id: "summary",
      header: "Summary",
      enableSorting: false,
      meta: fitColumn,
      cell: (props) => {
        const transcription = props.row.original as Transcription;

        return (
          <TranscriptionSummary
            jobId={transcription.sk}
            initialTranscription={transcription}
          />
        );
      },
    },
    {
      id: "language",
      header: "Source Language",
      accessorFn: (transcription) => languagesFromTranscription(transcription),
      meta: fitColumn,
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
      meta: fitColumn,
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
      meta: fitColumn,
      cell: (props) => {
        const transcription = props.row.original;

        if (transcription.jobStatusUpdated?.detail.FailureReason) {
          return (
            <AlertRoot status="error" size={"md"}>
              <AlertIndicator />
              <AlertTitle>
                {transcription.jobStatusUpdated?.detail.FailureReason}
              </AlertTitle>
            </AlertRoot>
          );
        }

        return (
          <TranscriptionDownloadOptions
            initialTranscription={transcription}
            handlePlayClick={handlePlayClick}
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
      <VStack gap={4} align="stretch">
        {transcriptionsLoading && (
          <ProgressRoot value={null} colorPalette={"blue"}>
            <ProgressBar />
          </ProgressRoot>
        )}

        {!transcriptionsLoading &&
          transcriptions &&
          transcriptions.length === 0 && (
            <>
              <Alert status="info" title={"Getting Started"}>
                <Box>
                  <Link as={NextLink} href={"/transcription/upload"}>
                    Upload Media
                  </Link>{" "}
                  to start the transcription process.
                </Box>
              </Alert>
            </>
          )}
        {!transcriptionsLoading &&
          transcriptions &&
          transcriptions.length > 0 && (
            <>
              <InputGroup startElement={<MappedIcon icon={"search"} />}>
                <Input
                  value={filter}
                  placeholder={searchInputPlaceholder}
                  onChange={(e) => setFilter(() => e.target.value)}
                  aria-label={searchInputPlaceholder}
                  variant={"outline"}
                />
              </InputGroup>
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
        summary={play?.summary}
        languages={play?.languages}
        speakers={play?.speakers}
        open={open}
        onOpenChange={onMediaPlayerOpenChange}
      />
    </>
  );
};

Transcriptions.getLayout = (page) => {
  return (
    <AuthenticatedLayout pageTitle={"My Transcriptions"} isLanding={false}>
      <TranscriptionsContextProvider>{page}</TranscriptionsContextProvider>
    </AuthenticatedLayout>
  );
};

export default Transcriptions;
