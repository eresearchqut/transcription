import "../styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import { signInWithRedirect } from "aws-amplify/auth";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import type { ReactElement, ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AsyncErrorBoundary } from "@/components/errorBoundary";
import { ErrorMessage } from "@/components/errorMessage";
import { Provider } from "@/components/ui/provider";
import { AnalyticsProvider } from "../context/analytics-context";
import { AuthProvider } from "../context/auth-context";
import { MonitoringProvider } from "../context/monitoring-context";
import Layout from "../layout/layout";

export type NextPageWithLayout<P = NonNullable<unknown>, IP = P> = NextPage<
  P,
  IP
> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID!,
      userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_AUTH_DOMAIN!,
          scopes: [
            "phone",
            "email",
            "profile",
            "openid",
            "aws.cognito.signin.user.admin",
          ],
          redirectSignIn: [process.env.NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT!],
          redirectSignOut: [process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT!],
          responseType: "token",
        },
      },
      identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID!,
      allowGuestAccess: false,
    },
  },
  Storage: {
    S3: {
      bucket: process.env.NEXT_PUBLIC_TRANSCRIPTION_BUCKET,
      region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2",
    },
  },
});

export const handleLogin = async () => {
  await signInWithRedirect({ provider: { custom: "QUT" } });
};

const queryClient = new QueryClient();

function App({ Component, pageProps }: AppPropsWithLayout) {
  const { pageTitle, isLanding, ...componentProps } = pageProps;
  const getLayout =
    Component.getLayout ??
    ((page) => (
      <Layout
        isLanding={isLanding}
        isAuthenticated={false}
        pageTitle={pageTitle}
        onLogin={handleLogin}
      >
        {page}
      </Layout>
    ));
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>QUT Transcribe</title>
      </Head>
      <Provider>
        <AnalyticsProvider>
          <MonitoringProvider>
            <AuthProvider>
              <ReactErrorBoundary FallbackComponent={ErrorMessage}>
                <AsyncErrorBoundary>
                  {getLayout(<Component {...componentProps} />)}
                </AsyncErrorBoundary>
              </ReactErrorBoundary>
            </AuthProvider>
          </MonitoringProvider>
        </AnalyticsProvider>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
