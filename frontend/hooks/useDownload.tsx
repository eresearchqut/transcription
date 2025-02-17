import { useState } from "react";
import { useAuth, useLogout } from "../context/auth-context";
import transcriptDocument, {
  TranscriptJob,
} from "../components/transcriptDocument";
import { Packer } from "docx";
import srtConvert from "aws-transcription-to-srt";
import toWebVTT from "srt-webvtt";
import { downloadData, getUrl } from "aws-amplify/storage";

export interface DownloadProps {
  filename: string;
  objectKey: string;
}

export type TranscriptFormat = "srt" | "vtt" | "docx";
export interface DownloadTranscriptProps extends DownloadProps {
  format: TranscriptFormat;
}

export const useDownload = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { handleLogout } = useLogout();
  const { getCurrentSession } = useAuth();

  const handleDownload = (fileName: string, url: string) => {
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const download = ({
    downloadUrl,
    filename,
  }: {
    downloadUrl: Promise<string>;
    filename: string;
  }) => {
    setIsLoading(() => true);
    downloadUrl
      .then((url) => {
        handleDownload(filename, url);
      })
      .catch(() => handleLogout())
      .finally(() => setIsLoading(() => false));
  };

  const fetchMediaUrl = async (
    objectKey: string,
    fileName: string,
  ): Promise<string> =>
    getCurrentSession()
      .then(() =>
        getUrl({
          path: ({ identityId }) => `private/${identityId}/${objectKey}`,
          options: {
            contentDisposition: `attachment; filename = ${fileName}`,
          },
        }).then((output) => output.url.href),
      )
      .catch((e) => {
        handleLogout().then();
        throw e;
      });

  const fetchTranscriptUrl = async (
    objectKey: string,
    format: "srt" | "vtt" | "docx",
  ): Promise<string> => {
    return getCurrentSession()
      .then(() =>
        downloadData({
          path: ({ identityId }) => `private/${identityId}/${objectKey}`,
        }),
      )
      .then((downloadDataOutput) => downloadDataOutput.result)
      .then((downloadDataOutputResult) => downloadDataOutputResult.body.text())
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob)
      .then((transcriptJob) =>
        format === "docx"
          ? Packer.toBlob(transcriptDocument(transcriptJob))
          : new Blob([srtConvert(transcriptJob)], { type: "text/plain" }),
      )
      .then((blob) =>
        format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
      )
      .catch((e) => {
        handleLogout().then();
        throw e;
      });
  };

  const downloadFile = ({ objectKey, filename }: DownloadProps) => {
    download({ downloadUrl: fetchMediaUrl(objectKey, filename), filename });
  };

  const downloadTranscript = ({
    objectKey,
    filename,
    format,
  }: DownloadTranscriptProps) => {
    download({
      downloadUrl: fetchTranscriptUrl(objectKey, format),
      filename,
    });
  };

  return {
    fetchMediaUrl,
    fetchTranscriptUrl,
    downloadFile,
    downloadTranscript,
    isLoading,
  };
};
