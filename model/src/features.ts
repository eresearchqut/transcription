/**
 * Features that can be turned on and off while the service runs. They are
 * read from the `/app/{env}/transcription/features` parameter, and each one is
 * off unless the parameter sets it to true.
 */
export interface FeatureFlags {
  /** Each upload must be assigned an RPID that the DMP confirms. */
  rpid: boolean;
  /**
   * Job records are copied into the permanent usage table, and the landing
   * page says so.
   */
  usageLog: boolean;
}

export const FEATURES_OFF: FeatureFlags = {
  rpid: false,
  usageLog: false,
};
