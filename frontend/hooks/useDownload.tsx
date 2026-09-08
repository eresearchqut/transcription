import { Packer } from "docx";
import { useState } from "react";
import toWebVTT from "srt-webvtt";
import { downloadText, getSignedObjectUrl } from "../client/storage";
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
export interface TranscriptOptions {
  includeSpeakers?: boolean;
  includeLanguages?: boolean;
}
export interface DownloadTranscriptProps extends DownloadProps {
  format: TranscriptFormat;
  options?: TranscriptOptions;
}

export type TranslatedTranscriptFormat = "srt" | "vtt" | "docx" | "txt";
export interface DownloadTranslatedTranscriptProps extends DownloadProps {
  format: TranslatedTranscriptFormat;
  options?: TranscriptOptions;
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
      getSignedObjectUrl(objectKey, {
        contentDisposition: `attachment; filename = ${fileName}`,
      }),
    );

  const downloadTranscriptJob = (objectKey: string): Promise<TranscriptJob> =>
    getCurrentSession()
      .then(() => downloadText(objectKey))
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob);

  const fetchTranscriptUrl = async (
    objectKey: string,
    format: TranscriptFormat,
    {
      includeSpeakers = false,
      includeLanguages = false,
    }: TranscriptOptions = {},
  ): Promise<string> => {
    return downloadTranscriptJob(objectKey)
      .then((transcriptJob) => {
        switch (format) {
          case "docx":
            return Packer.toBlob(
              transcriptDocument(transcriptJob, {
                includeSpeakers,
                includeLanguages,
              }),
            );
          case "txt":
            return new Blob(
              [
                segmentsToText(transcriptJob, {
                  includeSpeakers,
                  includeLanguages,
                }),
              ],
              {
                type: "text/plain",
              },
            );
          default:
            return new Blob(
              [
                segmentsToSrt(transcriptJob, {
                  includeSpeakers,
                  includeLanguages,
                }),
              ],
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
    {
      includeSpeakers = false,
      includeLanguages = false,
    }: TranscriptOptions = {},
  ): Promise<string> => {
    return getCurrentSession()
      .then(() => downloadText(objectKey))
      .then((dataBodyText) => JSON.parse(dataBodyText) as TranscriptJob)
      .then((transcriptJob) => {
        switch (format) {
          case "docx":
            return Packer.toBlob(
              transcriptDocument(transcriptJob, {
                includeSpeakers,
                includeLanguages,
              }),
            );
          case "txt":
            return new Blob(
              [
                segmentsToText(transcriptJob, {
                  includeSpeakers,
                  includeLanguages,
                }),
              ],
              {
                type: "text/plain",
              },
            );
          default:
            return new Blob(
              [
                segmentsToSrt(transcriptJob, {
                  includeSpeakers,
                  includeLanguages,
                }),
              ],
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
    options,
  }: DownloadTranscriptProps) => {
    const transcriptOptions: Required<TranscriptOptions> = {
      includeSpeakers: false,
      includeLanguages: false,
      ...options,
    };
    track("download-transcript", { format, ...transcriptOptions });
    download({
      downloadUrl: fetchTranscriptUrl(objectKey, format, transcriptOptions),
      filename,
    });
  };

  const downloadTranslatedTranscript = ({
    objectKey,
    filename,
    format,
    options,
  }: DownloadTranslatedTranscriptProps) => {
    const transcriptOptions: Required<TranscriptOptions> = {
      includeSpeakers: false,
      includeLanguages: false,
      ...options,
    };
    track("download-translation", { format, ...transcriptOptions });
    download({
      downloadUrl: fetchTranslatedTranscriptUrl(
        objectKey,
        format,
        transcriptOptions,
      ),
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
