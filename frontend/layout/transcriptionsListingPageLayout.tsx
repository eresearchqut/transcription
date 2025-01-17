import { PropsWithChildren } from "react";
import Layout from "./layout";
import { TranscriptionsContextProvider } from "../context/transcriptions-context";

const WithTranscriptionsListingContext = ({
  children,
  ...props
}: PropsWithChildren) => {
  return (
    <TranscriptionsContextProvider>
      <Layout pageTitle={"My Transcriptions"} {...props}>
        {children}
      </Layout>
    </TranscriptionsContextProvider>
  );
};

const mapTranscriptionsListingPagePropsToLayoutTree = (
  props: PropsWithChildren,
) => <WithTranscriptionsListingContext {...props} />;

export default mapTranscriptionsListingPagePropsToLayoutTree;
