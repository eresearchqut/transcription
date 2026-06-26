import { useState } from "react";
import { useAuth } from "../context/auth-context";
import transcriptDocument, {
  TranscriptJob,
} from "../components/transcriptDocument";
import { segmentsToSrt, segmentsToText } from "../components/segmentSubtitles";
import { Packer } from "docx";
import srtConvert from "aws-transcription-to-srt";
import toWebVTT from "srt-webvtt";
import { downloadData, getUrl } from "aws-amplify/storage";
import { useAnalytics } from "../context/analytics-context";
import { decodeFilename } from "../utils/filename";
import {
  LanguageSpan,
  languageSpansFromTranscript,
} from "../components/transcriptLanguages";

export interface DownloadProps {
  filename: string;
  objectKey: string;
}

export type TranscriptFormat = "srt" | "vtt" | "docx";
export interface DownloadTranscriptProps extends DownloadProps {
  format: TranscriptFormat;
}

export type TranslatedTranscriptFormat = "srt" | "vtt" | "docx" | "txt";
export interface DownloadTranslatedTranscriptProps extends DownloadProps {
  format: TranslatedTranscriptFormat;
}

export const useDownload = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { track } = useAnalytics();
  const { getCurrentSession } = useAuth();

  const handleDownload = (fileName: string, url: string) => {
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", decodeFilename(fileName));
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
      .finally(() => setIsLoading(() => false));
  };

  const fetchMediaUrl = async (
    objectKey: string,
    fileName: string,
  ): Promise<string> =>
    getCurrentSession().then(() =>
      getUrl({
        path: objectKey.startsWith("users/")
          ? objectKey
          : ({ identityId }) => `private/${identityId}/${objectKey}`,
        options: {
          contentDisposition: `attachment; filename = ${fileName}`,
        },
      }).then((output) => output.url.href),
    );

  const downloadTranscriptJob = (objectKey: string): Promise<TranscriptJob> =>
    getCurrentSession()
      .then(() =>
        downloadData({
          path: objectKey.startsWith("users/")
            ? objectKey
            : ({ identityId }) => `private/${identityId}/${objectKey}`,
        }),
      )
      .then((downloadDataOutput) => downloadDataOutput.result)
      .then((downloadDataOutputResult) => downloadDataOutputResult.body.text())
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob);

  const fetchTranscriptUrl = async (
    objectKey: string,
    format: "srt" | "vtt" | "docx",
  ): Promise<string> => {
    return downloadTranscriptJob(objectKey)
      .then((transcriptJob) =>
        format === "docx"
          ? Packer.toBlob(transcriptDocument(transcriptJob))
          : new Blob([srtConvert(transcriptJob)], { type: "text/plain" }),
      )
      .then((blob) =>
        format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
      );
  };

  const fetchTranscriptForPlayer = async (
    objectKey: string,
  ): Promise<{ url: string; languages: LanguageSpan[] }> => {
    return downloadTranscriptJob(objectKey).then(async (transcriptJob) => {
      const blob = new Blob([srtConvert(transcriptJob)], {
        type: "text/plain",
      });
      return {
        url: await toWebVTT(blob),
        languages: languageSpansFromTranscript(transcriptJob),
      };
    });
  };

  // Translations are stored as a Transcribe-shaped JSON with translated SEGMENTS
  // (no word-level items), so subtitles are rebuilt from segment timings rather
  // than via the word-based `srtConvert` used for the original transcript.
  const fetchTranslatedTranscriptUrl = async (
    objectKey: string,
    format: TranslatedTranscriptFormat,
    { includeSpeakers = true }: { includeSpeakers?: boolean } = {},
  ): Promise<string> => {
    return getCurrentSession()
      .then(() =>
        downloadData({
          path: objectKey.startsWith("users/")
            ? objectKey
            : ({ identityId }) => `private/${identityId}/${objectKey}`,
        }),
      )
      .then((downloadDataOutput) => downloadDataOutput.result)
      .then((downloadDataOutputResult) => downloadDataOutputResult.body.text())
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob)
      .then((transcriptJob) => {
        switch (format) {
          case "docx":
            return Packer.toBlob(transcriptDocument(transcriptJob));
          case "txt":
            return new Blob([segmentsToText(transcriptJob)], {
              type: "text/plain",
            });
          default:
            return new Blob(
              [segmentsToSrt(transcriptJob, { includeSpeakers })],
              {
                type: "text/plain",
              },
            );
        }
      })
      .then((blob) =>
        format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
      );
  };

  const downloadFile = ({ objectKey, filename }: DownloadProps) => {
    download({
      downloadUrl: fetchMediaUrl(objectKey, filename),
      filename,
    });
  };

  const downloadTranscript = ({
    objectKey,
    filename,
    format,
  }: DownloadTranscriptProps) => {
    track("download-transcript", { format });
    download({
      downloadUrl: fetchTranscriptUrl(objectKey, format),
      filename,
    });
  };

  const downloadTranslatedTranscript = ({
    objectKey,
    filename,
    format,
  }: DownloadTranslatedTranscriptProps) => {
    track("download-translation", { format });
    download({
      downloadUrl: fetchTranslatedTranscriptUrl(objectKey, format),
      filename,
    });
  };

  return {
    fetchMediaUrl,
    fetchTranscriptUrl,
    fetchTranscriptForPlayer,
    fetchTranslatedTranscriptUrl,
    downloadFile,
    downloadTranscript,
    downloadTranslatedTranscript,
    isLoading,
  };
};
