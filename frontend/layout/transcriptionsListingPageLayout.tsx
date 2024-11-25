import { PropsWithChildren } from "react";
import { Layout, PageProps } from "./layout";
import { TranscriptionsContextProvider } from "../context/transcriptions-context";

export interface WithAuthenticationProps
  extends PropsWithChildren<Partial<PageProps>> {}

const WithTranscriptionListing = (props: WithAuthenticationProps) => {
  const pageProps = {
    pageTitle: "My Transcriptions",
    ...props,
  };
  return <Layout {...pageProps} />;
};

const WithTranscriptionsListingContext = (props: WithAuthenticationProps) => {
  return (
    <TranscriptionsContextProvider>
      <WithTranscriptionListing {...props} />
    </TranscriptionsContextProvider>
  );
};

const mapTranscriptionsListingPagePropsToLayoutTree = (
  props: WithAuthenticationProps,
) => <WithTranscriptionsListingContext {...props} />;

export default mapTranscriptionsListingPagePropsToLayoutTree;
