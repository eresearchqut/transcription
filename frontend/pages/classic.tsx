import { NextPageWithLayout } from "@/pages/_app";
import { useState } from "react";

import NextLink from "next/link";
import { v4 as uuid } from "uuid";
import { useAuth } from "../context/auth-context";
import { Link, Text, VStack } from "@chakra-ui/react";
import { TranscriptionProgress } from "@/components/transcriptionProgress";
import { MediaPlayerDrawerProps } from "@/components/mediaPlayerDrawer/mediaPlayerDrawer";
import { MediaPlayerDrawer } from "@/components/mediaPlayerDrawer";
import type { LanguageSpan } from "@/components/transcriptLanguages";
import { LegacyMediaUpload, TranscribeProps } from "@/components/mediaUpload";
import { OpenChangeDetails } from "@zag-js/dialog";
import { uploadData } from "aws-amplify/storage";
import { useAnalytics } from "../context/analytics-context";
import { pick } from "lodash";
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
      "mediaUrl" | "transcriptUrl" | "summary" | "languages"
    >
  >({} as MediaPlayerDrawerProps);
  const [open, setOpen] = useState(false);
  const { track } = useAnalytics();
  const onMediaPlayerOpenChange = (e: OpenChangeDetails) => setOpen(e.open);
  const onPlayClick = (
    mediaUrl: string,
    transcriptUrl: string,
    summary?: string,
    languages?: LanguageSpan[],
  ) => {
    setPlay({
      mediaUrl,
      transcriptUrl,
      summary,
      languages,
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

      getCurrentSession().then(() =>
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
      );
    };

    files.forEach((file) => uploadFile(file, transcribeProps));
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
