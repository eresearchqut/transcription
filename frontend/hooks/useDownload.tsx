import { downloadData, getUrl } from "aws-amplify/storage";
import { Packer } from "docx";
import { useState } from "react";
import toWebVTT from "srt-webvtt";
import {
  segmentsToSrt,
  segmentsToText,
  speakerLabels,
} from "../components/segmentSubtitles";
import transcriptDocument, {
  type TranscriptJob,
} from "../components/transcriptDocument";
import { languageCodesFromTranscript } from "../components/transcriptLanguages";
import { useAnalytics } from "../context/analytics-context";
import { useAuth } from "../context/auth-context";
import { decodeFilename } from "../utils/filename";

export interface DownloadProps {
  filename: string;
  objectKey: string;
}

export type TranscriptFormat = "srt" | "vtt" | "docx" | "txt";
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
        path: objectKey,
        options: {
          contentDisposition: `attachment; filename = ${fileName}`,
        },
      }).then((output) => output.url.href),
    );

  const downloadTranscriptJob = (objectKey: string): Promise<TranscriptJob> =>
    getCurrentSession()
      .then(() =>
        downloadData({
          path: objectKey,
        }),
      )
      .then((downloadDataOutput) => downloadDataOutput.result)
      .then((downloadDataOutputResult) => downloadDataOutputResult.body.text())
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob);

  const fetchTranscriptUrl = async (
    objectKey: string,
    format: TranscriptFormat,
  ): Promise<string> => {
    return downloadTranscriptJob(objectKey)
      .then((transcriptJob) => {
        switch (format) {
          case "docx":
            return Packer.toBlob(transcriptDocument(transcriptJob));
          case "txt":
            return new Blob([segmentsToText(transcriptJob)], {
              type: "text/plain",
            });
          default:
            return new Blob([segmentsToSrt(transcriptJob)], {
              type: "text/plain",
            });
        }
      })
      .then((blob) =>
        format === "vtt" ? toWebVTT(blob) : URL.createObjectURL(blob),
      );
  };

  const fetchTranscriptForPlayer = async (
    objectKey: string,
  ): Promise<{
    url: string;
    languages: (string | undefined)[];
    speakers: string[];
  }> => {
    return downloadTranscriptJob(objectKey).then(async (transcriptJob) => {
      const blob = new Blob(
        [segmentsToSrt(transcriptJob, { includeSpeakers: false })],
        {
          type: "text/plain",
        },
      );
      return {
        url: await toWebVTT(blob),
        languages: languageCodesFromTranscript(transcriptJob),
        speakers: speakerLabels(transcriptJob),
      };
    });
  };

  // Translations are stored as a Transcribe-shaped JSON with translated SEGMENTS
  // (no word-level items), so subtitles are rebuilt from segment timings, the
  // same segment-based approach used for the original transcript.
  const fetchTranslatedTranscriptUrl = async (
    objectKey: string,
    format: TranslatedTranscriptFormat,
    { includeSpeakers = false }: { includeSpeakers?: boolean } = {},
  ): Promise<string> => {
    return getCurrentSession()
      .then(() =>
        downloadData({
          path: objectKey,
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
