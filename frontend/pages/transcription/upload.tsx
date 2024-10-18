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
import { MediaUploadProgress } from "../../components/mediaUploadProgress/mediaUploadProgress";

const Upload: NextPage = () => {
  const {
    state: { user, isAuthenticated },
  } = useAuth();

  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(
    new Map(),
  );

  const [expectedCount, setExpectedCount] = useState<number>(0);
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
        .then(() =>
          Storage.put(key, file, {
            level: "private",
            metadata,
            progressCallback: (progress) => {
              setUploadProgress((current) => {
                const update = new Map(current);
                const progressPercent = progress.loaded / progress.total;
                if (progressPercent >= 1) {
                  update.delete(file.name);
                } else {
                  update.set(file.name, progressPercent);
                }
                return update;
              });
            },
          }).then(() => setExpectedCount((current) => current + 1)),
        )
        .catch((e) => handleLogout());
    };

    // files.forEach((file) => console.log(`upload file ${file}`));
    // files.forEach((file) =>
    //   setUploadProgress((current) => {
    //     const update = new Map(current);
    //     update.set(file.name, 27);
    //     return update;
    //   }),
    // );
    files.forEach((file) => uploadFile(file, transcribeProps));
  };

  return (
    <VStack spacing={4} align="stretch">
      <MediaUpload onSubmit={uploadFiles} />
      <MediaUploadProgress uploadProgress={uploadProgress} />
    </VStack>
  );
};

export default withLayout(<Layout pageTitle={"Upload Media"} />)(Upload);
