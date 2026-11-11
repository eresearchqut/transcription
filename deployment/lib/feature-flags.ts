/**
 * The parameter the handlers read the feature flags from while they run. No
 * stack creates it, so a deploy never undoes a flag changed since.
 */
export const featureFlagsParameterName = (envName: string): string =>
  `/app/${envName}/transcription/features`;

/**
 * What a local deploy turns on, which is every flag. Keep it in step with
 * FeatureFlags in model/src/features.ts.
 */
export const LOCAL_FEATURE_FLAGS = {
  rpid: true,
  usageLog: true,
};
