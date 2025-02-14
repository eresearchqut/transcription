import { useState } from "react";
import { useLogout } from "../context/auth-context";
import { Auth, Storage } from "aws-amplify";
import transcriptDocument, {
  TranscriptJob,
} from "../components/transcriptDocument";
import { Packer } from "docx";
import srtConvert from "aws-transcription-to-srt";
import toWebVTT from "srt-webvtt";

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
    Auth.currentSession()
      .then(() =>
        Storage.get(objectKey, {
          level: "private",
          contentDisposition: `attachment; filename = ${fileName}`,
        }),
      )
      .catch((e) => {
        handleLogout().then();
        throw e;
      });

  const fetchTranscriptUrl = async (
    objectKey: string,
    format: "srt" | "vtt" | "docx",
  ): Promise<string> => {
    return Auth.currentSession()
      .then(() =>
        Storage.get(objectKey, {
          level: "private",
          download: true,
        })
          .then((output: any) => (output.Body as Blob).text())
          .then((text) => JSON.parse(text) as TranscriptJob)
          .then((transcriptJob) =>
            format === "docx"
              ? Packer.toBlob(transcriptDocument(transcriptJob))
              : new Blob([srtConvert(transcriptJob)], { type: "text/plain" }),
          )
          .then((blob) =>
            format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
          ),
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
