import { Link, Text, VStack } from "@chakra-ui/react";
import type { OpenChangeDetails } from "@zag-js/dialog";
import { uploadData } from "aws-amplify/storage";
import { pick } from "lodash";
import NextLink from "next/link";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { MediaPlayerDrawer } from "@/components/mediaPlayerDrawer";
import type { MediaPlayerDrawerProps } from "@/components/mediaPlayerDrawer/mediaPlayerDrawer";
import {
  LegacyMediaUpload,
  type TranscribeProps,
} from "@/components/mediaUpload";
import { TranscriptionProgress } from "@/components/transcriptionProgress";
import type { NextPageWithLayout } from "@/pages/_app";
import { useAnalytics } from "../context/analytics-context";
import { useAuth } from "../context/auth-context";
import AuthenticatedLayout from "../layout/authenticatedLayout";
import { encodeFilename } from "../utils/filename";

interface UploadProps {
  filename: string;
  uploadProgressPercent: number;
  isPreparingUpload: boolean;
  transcriptionProgress: any;
}

const ClassicUpload: NextPageWithLayout = () => {
  const { user, getCurrentSession } = useAuth();

  const [play, setPlay] = useState<
    Pick<
      MediaPlayerDrawerProps,
      "mediaUrl" | "transcriptUrl" | "summary" | "languages" | "speakers"
    >
  >({} as MediaPlayerDrawerProps);
  const [open, setOpen] = useState(false);
  const { track } = useAnalytics();
  const onMediaPlayerOpenChange = (e: OpenChangeDetails) => setOpen(e.open);
  const onPlayClick = (
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
    track("open-player");
  };

  const [uploadProps, setUploadProps] = useState<Record<string, UploadProps>>(
    {},
  );

  const uploadFiles = (transcribeProps: TranscribeProps, files: File[]) => {
    const uploadFile = (
      file: File,
      {
        languages,
        enablePiiRedaction,
        generateSummary,
        targetLanguage,
      }: TranscribeProps,
    ) => {
      const id = uuid();
      const key = `users/${user!.id}/${id}.upload`;
      const metadata = {
        filename: encodeFilename(file.name),
        mimetype: file.type,
        filetype: "userUploadedFile",
        languages: languages.join(","),
        enablePiiRedaction: JSON.stringify(enablePiiRedaction),
        generateSummary: JSON.stringify(generateSummary),
        targetLanguage: targetLanguage ?? "",
      };

      track(
        "upload-file",
        pick(metadata, [
          "mimetype",
          "languages",
          "enablePiiRedaction",
          "generateSummary",
          "targetLanguage",
        ]),
      );

      setUploadProps((current) => {
        return {
          ...current,
          [id]: {
            filename: file.name,
            uploadProgressPercent: 0,
            isPreparingUpload: true,
            transcriptionProgress: undefined,
          },
        };
      });

      getCurrentSession()
        .then(() =>
          uploadData({
            path: key,
            data: file,
            options: {
              contentDisposition: `attachment; filename = ${metadata.filename}`,
              metadata,
              onProgress: ({ transferredBytes, totalBytes }) => {
                const progressPercent =
                  (transferredBytes / (totalBytes ?? 1)) * 100;

                setUploadProps((current) => {
                  return {
                    ...current,
                    [id]: {
                      filename: file.name,
                      uploadProgressPercent: progressPercent,
                      isPreparingUpload: false,
                      transcriptionProgress: undefined,
                    },
                  };
                });
              },
            },
          }).result.then(() => {
            setUploadProps((current) => {
              if (!current[id]) return current;
              return {
                ...current,
                [id]: {
                  ...current[id],
                  uploadProgressPercent: 100,
                  isPreparingUpload: false,
                },
              };
            });
          }),
        )
        .catch((error) => {
          console.error("Upload failed", error);
          setUploadProps((current) => {
            if (!current[id]) return current;
            return {
              ...current,
              [id]: {
                ...current[id],
                isPreparingUpload: false,
              },
            };
          });
        });
    };

    files.forEach((file) => {
      void uploadFile(file, transcribeProps);
    });
  };

  return (
    <>
      <VStack gap={4} align="stretch">
        <Text color={"fg.muted"}>
          You&apos;re using the classic upload view.{" "}
          <Link as={NextLink} href={"/"} colorPalette={"blue"}>
            Switch to the guided view
          </Link>
          .
        </Text>
        {Object.entries(uploadProps).map(
          ([key, { filename, uploadProgressPercent, isPreparingUpload }]) => (
            <TranscriptionProgress
              key={key}
              jobId={key}
              filename={filename}
              uploadProgress={uploadProgressPercent}
              isPreparingUpload={isPreparingUpload}
              onPlayClick={onPlayClick}
            />
          ),
        )}
        <LegacyMediaUpload onSubmit={uploadFiles} identityId={user?.id} />
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

ClassicUpload.getLayout = (page) => {
  return (
    <AuthenticatedLayout isLanding={false} pageTitle={"Upload Media (Classic)"}>
      {page}
    </AuthenticatedLayout>
  );
};

export default ClassicUpload;
