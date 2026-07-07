import type { Duration } from "date-fns";
import type { Accept } from "react-dropzone";

export interface TranscribeQuotaProps {
  accept: Accept;
  minimumDuration: Duration;
  maximumDuration: Duration;
  maximumFileSizeBytes: number;
  maximumFilesCount?: number;
  storageDuration: Duration;
  supportedFileFormats?: string[];
}

export const SUPPORTED_FILE_FORMATS = [
  "mp3",
  "mp4",
  "m4a",
  "wav",
  "flac",
  "ogg",
  "webm",
  "amr",
];

const ACCEPTED_FILE_TYPES: Accept = {
  "audio/flac": [],
  "audio/mpeg": [],
  "audio/mp4": [],
  "video/mp4": [],
  "audio/m4a": [],
  "audio/x-m4a": [],
  "application/ogg": [],
  "audio/ogg": [],
  "video/ogg": [],
  "video/webm": [],
  "audio/webm": [],
  "audio/amr": [],
  "audio/x-wav": [],
  "audio/vnd.wave": [],
  "audio/wav": [],
  "audio/wave": [],
  "audio/x-pn-wav": [],
};

export const TRANSCRIBE_QUOTAS: TranscribeQuotaProps = {
  accept: ACCEPTED_FILE_TYPES,
  minimumDuration: { seconds: 5 },
  maximumDuration: { hours: 4 },
  maximumFileSizeBytes: 1024 * 1024 * 1024 * 2,
  storageDuration: { days: 14 },
  supportedFileFormats: SUPPORTED_FILE_FORMATS,
};
