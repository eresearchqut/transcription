import { NextPage } from "next";
import { withLayout } from "@moxy/next-layout";
import Layout from "../../components/layout";
import * as React from "react";
import { useState } from "react";
import { MediaUpload, TranscribeProps } from "../../forms/mediaUpload";
import { v4 as uuid } from "uuid";
import Auth from "@aws-amplify/auth";
import { Storage } from "aws-amplify";
import { useAuth, useLogout } from "../../context/auth-context";
import { VStack } from "@chakra-ui/react";
import { FileTranscriptionProgress } from "../../components/fileTranscriptionProgress/fileTranscriptionProgress";

interface UploadProps {
  filename: string;
  uploadProgressPercent: number;
  transcriptionProgressPercent: number;
}

const Upload: NextPage = () => {
  const {
    state: { user, isAuthenticated },
  } = useAuth();

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
          uploadData.set(key, {
            filename: file.name,
            uploadProgressPercent: 0,
            transcriptionProgressPercent: 0,
          });
          return Storage.put(key, file, {
            level: "private",
            metadata,
            progressCallback: (progress) => {
              const progressPercent = (progress.loaded / progress.total) * 100;
              setUploadData((current) => {
                const updatedData = new Map(current);
                updatedData.set(key, {
                  filename: file.name,
                  uploadProgressPercent: progressPercent,
                  transcriptionProgressPercent: 0,
                });
                return updatedData;
              });
            },
          });
        })
        .catch((e) => handleLogout());
    };

    files.forEach((file) => uploadFile(file, transcribeProps));
  };

  return (
    <VStack spacing={4} align="stretch">
      <MediaUpload onSubmit={uploadFiles} />
      {Array.from(uploadData.entries()).map(
        ([key, { filename, uploadProgressPercent }]) => (
          <FileTranscriptionProgress
            key={key}
            filename={filename}
            uploadProgress={uploadProgressPercent}
            transcriptionProgress={0}
          />
        ),
      )}
    </VStack>
  );
};

export default withLayout(<Layout pageTitle={"Upload Media"} />)(Upload);
