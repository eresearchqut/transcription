// Original filenames are stored percent-encoded in S3 object metadata so the
// raw upload metadata stays ASCII-safe. Use these helpers as the single source
// of truth for encoding on upload and decoding for display/download.

export const encodeFilename = (filename: string): string =>
  encodeURIComponent(filename);

export const decodeFilename = (filename: string): string => {
  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};
