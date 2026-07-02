import { NextPageWithLayout } from "@/pages/_app";
import { useState } from "react";

import { v4 as uuid } from "uuid";
import { useAuth } from "../context/auth-context";
import { VStack, Text } from "@chakra-ui/react";
import { TranscriptionProgress } from "@/components/transcriptionProgress";
import { MediaPlayerDrawerProps } from "@/components/mediaPlayerDrawer/mediaPlayerDrawer";
import { MediaPlayerDrawer } from "@/components/mediaPlayerDrawer";
import { MediaUpload, TranscribeProps } from "@/components/mediaUpload";
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
  uploaded: boolean;
  transcriptionProgress: any;
}

const Upload: NextPageWithLayout = () => {
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
            uploaded: false,
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
                    uploaded: false,
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
                uploaded: true,
              },
            };
          });
        }),
      );
    };

    files.forEach((file) => uploadFile(file, transcribeProps));
  };

  const uploadEntries = Object.entries(uploadProps);
  const uploadsComplete =
    uploadEntries.length > 0 && uploadEntries.every(([, p]) => p.uploaded);

  return (
    <>
      <VStack gap={4} align="stretch">
        <MediaUpload
          onSubmit={uploadFiles}
          identityId={user?.id}
          uploadsComplete={uploadsComplete}
          onClearUploads={() => setUploadProps({})}
        >
          {uploadEntries.length > 0 ? (
            uploadEntries.map(
              ([
                key,
                { filename, uploadProgressPercent, isPreparingUpload },
              ]) => (
                <TranscriptionProgress
                  key={key}
                  jobId={key}
                  filename={filename}
                  uploadProgress={uploadProgressPercent}
                  isPreparingUpload={isPreparingUpload}
                  onPlayClick={onPlayClick}
                />
              ),
            )
          ) : (
            <Text>
              Your files are uploading. Their progress will appear here.
            </Text>
          )}
        </MediaUpload>
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

Upload.getLayout = (page) => {
  return (
    <AuthenticatedLayout
      isLanding={false}
      pageTitle={"Upload Media"}
      contentMaxWidth={"4xl"}
    >
      {page}
    </AuthenticatedLayout>
  );
};

export default Upload;
