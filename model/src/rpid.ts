/**
 * A research project that transcriptions are assigned to, identified by its
 * Research Project ID (RPID) in the Data Management Planning (DMP) tool. This
 * is the transcription service's own view of a DMP plan, so a change to the DMP
 * contract only touches the mapping in api/src/client/dmpClient.ts.
 */
export interface Rpid {
  rpid: string;
  title: string;
  lead?: string;
  supervisor?: string;
  faculty?: string;
  school?: string;
}
