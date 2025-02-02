import { NextPage } from "next";
import { useState } from "react";
import { MediaUpload, TranscribeProps } from "../../forms/mediaUpload";
import { v4 as uuid } from "uuid";
import Auth from "@aws-amplify/auth";
import { Storage } from "aws-amplify";
import { useAuth, useLogout } from "../../context/auth-context";
import { VStack } from "@chakra-ui/react";
import { TranscriptionProgress } from "@/components/transcriptionProgress";
import { MediaPlayerDrawerProps } from "@/components/mediaPlayerDrawer/mediaPlayerDrawer";
import { MediaPlayerDrawer } from "@/components/mediaPlayerDrawer";
import { OpenChangeDetails } from "@zag-js/dialog";

interface UploadProps {
  filename: string;
  uploadProgressPercent: number;
  transcriptionProgress: any;
}

const Upload: NextPage = () => {
  const {
    state: { user },
  } = useAuth();

  const [play, setPlay] = useState<
    Pick<MediaPlayerDrawerProps, "mediaUrl" | "transcriptUrl">
  >({} as MediaPlayerDrawerProps);
  const [open, setOpen] = useState(false);
  const onMediaPlayerOpenChange = (e: OpenChangeDetails) => setOpen(e.open);
  const onPlayClick = (mediaUrl: string, transcriptUrl: string) => {
    setPlay({
      mediaUrl,
      transcriptUrl,
    });
    setOpen(true);
  };

  const [uploadData, setUploadData] = useState<Record<string, UploadProps>>({});

  const { handleLogout } = useLogout();

  const uploadFiles = (transcribeProps: TranscribeProps, files: File[]) => {
    const uploadFile = (
      file: File,
      { languages, enablePiiRedaction }: TranscribeProps,
    ) => {
      const id = uuid();
      const key = `${user?.id}/${id}.upload`;
      const metadata = {
        filename: encodeURIComponent(file.name),
        mimetype: file.type,
        filetype: "userUploadedFile",
        languages: languages.join(","),
        enablePiiRedaction: JSON.stringify(enablePiiRedaction),
      };

      setUploadData((current) => {
        return {
          ...current,
          [id]: {
            filename: file.name,
            uploadProgressPercent: 0,
            transcriptionProgress: undefined,
          },
        };
      });

      Auth.currentSession()
        .then(() => {
          return Storage.put(key, file, {
            level: "private",
            metadata,
            progressCallback: (progress) => {
              const progressPercent = (progress.loaded / progress.total) * 100;

              setUploadData((current) => {
                return {
                  ...current,
                  [id]: {
                    filename: file.name,
                    uploadProgressPercent: progressPercent,
                    transcriptionProgress: undefined,
                  },
                };
              });
            },
          });
        })
        .catch(() => {
          handleLogout().then();
        });
    };

    files.forEach((file) => uploadFile(file, transcribeProps));
  };

  return (
    <>
      <VStack gap={4} align="stretch">
        {Object.entries(uploadData).map(
          ([key, { filename, uploadProgressPercent }]) => (
            <TranscriptionProgress
              key={key}
              jobId={key}
              filename={filename}
              uploadProgress={uploadProgressPercent}
              onPlayClick={onPlayClick}
            />
          ),
        )}
        <MediaUpload onSubmit={uploadFiles} />
      </VStack>
      <MediaPlayerDrawer
        mediaUrl={play?.mediaUrl}
        transcriptUrl={play?.transcriptUrl}
        open={open}
        onOpenChange={onMediaPlayerOpenChange}
      />
    </>
  );
};

export const getStaticProps = () => {
  return {
    props: {
      pageTitle: "Upload",
    },
  };
};

export default Upload;
