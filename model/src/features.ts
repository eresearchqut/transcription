/**
 * Features that can be turned on and off while the service runs. They are
 * read from the `/app/{env}/transcription/features` parameter, and each one is
 * off unless the parameter sets it to true.
 */
export interface FeatureFlags {
  /** Each upload must be assigned an RPID that the DMP confirms. */
  rpid: boolean;
  /**
   * Jobs uploaded while it is on are recorded in the permanent usage table,
   * and the landing page says so.
   */
  usageLog: boolean;
}

export const FEATURES_OFF: FeatureFlags = {
  rpid: false,
  usageLog: false,
};
