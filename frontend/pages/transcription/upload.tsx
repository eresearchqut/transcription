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
import { FileTranscriptionProgress } from "../../components/fileTranscriptionProgress";
import {
  TranscriptionJobStatus,
  useTranscriptions,
} from "../../hooks/useTranscriptions";

interface UploadProps {
  filename: string;
  uploadProgressPercent: number;
  transcriptionProgress: any;
}

const Upload: NextPage = () => {
  const {
    state: { user, isAuthenticated },
  } = useAuth();

  const { transcriptions, getStatus, subscribeToTranscriptionJob } =
    useTranscriptions({ pollMode: "SUBSCRIBE" });
  // const { transcriptions, subscribeToTranscriptionJob, getStatus } = useContext(
  //   TranscriptionsContext,
  // );

  const [uploadData, setUploadData] = useState<Map<string, UploadProps>>(
    new Map(),
  );

  const { handleLogout } = useLogout();

  const getTranscriptionProgress = (jobId: string) => {
    const transcription = transcriptions.find((job) => job.sk === jobId);
    return {
      status: transcription
        ? (getStatus(transcription) as TranscriptionJobStatus)
        : undefined,
    };
  };

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
              if (progressPercent >= 100) {
                subscribeToTranscriptionJob(id);
              }
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
            transcriptionProgress={getTranscriptionProgress(key)}
          />
        ),
      )}
    </VStack>
  );
};

export default withLayout(<Layout pageTitle={"Upload Media"} />)(Upload);
