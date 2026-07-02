import type { SplunkOtelWebConfig } from "@splunk/otel-web";

/**
 * Browser-only lazy loader for Splunk RUM.
 *
 * The `@splunk/otel-web` and `@splunk/otel-web-session-recorder` packages touch
 * DOM globals (e.g. `Element`) at import time, which breaks Next.js static
 * export while collecting page data on the server. Importing them dynamically
 * from client-only code paths keeps them out of the server module graph.
 */

type SplunkOtelWeb = typeof import("@splunk/otel-web")["default"];

let splunkOtelWeb: SplunkOtelWeb | undefined;
let initialised = false;

export const initialiseSplunk = async (
  config: SplunkOtelWebConfig,
): Promise<void> => {
  if (typeof window === "undefined" || initialised || !config.rumAccessToken) {
    return;
  }
  initialised = true;

  const [{ default: SplunkOtelWeb }, { default: SplunkSessionRecorder }] =
    await Promise.all([
      import("@splunk/otel-web"),
      import("@splunk/otel-web-session-recorder"),
    ]);

  splunkOtelWeb = SplunkOtelWeb;
  SplunkOtelWeb.init({ ...config });
  SplunkSessionRecorder.init({ ...config });
};

export const setSplunkGlobalAttributes = (
  attributes: Record<string, any>,
): void => {
  splunkOtelWeb?.setGlobalAttributes(attributes);
};

export const getSplunkSessionId = (): string =>
  splunkOtelWeb?.getSessionId() ?? "";
