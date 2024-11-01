import { NextPage } from "next";
import { withLayout } from "@moxy/next-layout";
import Layout from "../../layout/layout";
import * as React from "react";
import { useState } from "react";
import { MediaUpload, TranscribeProps } from "../../forms/mediaUpload";
import { v4 as uuid } from "uuid";
import Auth from "@aws-amplify/auth";
import { Storage } from "aws-amplify";
import { useAuth, useLogout } from "../../context/auth-context";
import { useDisclosure, VStack } from "@chakra-ui/react";
import { TranscriptionProgress } from "../../components/transcriptionProgress";
import { MediaPlayerDrawerProps } from "../../components/mediaPlayerDrawer/mediaPlayerDrawer";
import { MediaPlayerDrawer } from "../../components/mediaPlayerDrawer";

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
  const { isOpen, onClose, onOpen } = useDisclosure();
  const onPlayClick = (mediaUrl: string, transcriptUrl: string) => {
    setPlay({
      mediaUrl,
      transcriptUrl,
    });
    onOpen();
  };

  const [uploadData, setUploadData] = useState<Map<string, UploadProps>>(
    new Map(),
  );

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

      Auth.currentSession()
        .then(() => {
          uploadData.set(id, {
            filename: file.name,
            uploadProgressPercent: 0,
            transcriptionProgress: undefined,
          });
          return Storage.put(key, file, {
            level: "private",
            metadata,
            progressCallback: (progress) => {
              const progressPercent = (progress.loaded / progress.total) * 100;
              setUploadData((current) => {
                const updatedData = new Map(current);
                updatedData.set(id, {
                  filename: file.name,
                  uploadProgressPercent: progressPercent,
                  transcriptionProgress: undefined,
                });
                return updatedData;
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
      <VStack spacing={4} align="stretch">
        <MediaUpload onSubmit={uploadFiles} />
        {Array.from(uploadData.entries()).map(
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

export default withLayout(<Layout pageTitle={"Upload Media"} />)(Upload);
