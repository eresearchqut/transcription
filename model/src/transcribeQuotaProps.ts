import { Accept } from "react-dropzone";

import { Duration } from "date-fns";

export interface TranscribeQuotaProps {
  accept: Accept;
  minimumDuration: Duration;
  maximumDuration: Duration;
  maximumFileSizeBytes: number;
  maximumFilesCount?: number;
  storageDuration: Duration;
  supportedFileFormats?: string[];
}

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
  supportedFileFormats: Array.from(
    new Set(
      Object.keys(ACCEPTED_FILE_TYPES).map(
        (mimeType) => mimeType.split(/[/.-]/).at(-1) ?? "",
      ),
    ).values(),
  ),
};
