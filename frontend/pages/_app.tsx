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

/**
 * Only a local deploy sets an emulator endpoint, where Cognito is served by the
 * emulator rather than by AWS. The hosted UI is reached the same way in both,
 * through the TLS proxy in `docker-compose.yml` locally, but the SDK calls
 * Amplify makes after sign-in have to be pointed at the emulator.
 */
const localEndpoint = process.env.NEXT_PUBLIC_AWS_ENDPOINT;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID!,
      userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID!,
      ...(localEndpoint
        ? {
            userPoolEndpoint: localEndpoint,
            identityPoolEndpoint: localEndpoint,
          }
        : {}),
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
          responseType: "code",
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
      // Amplify Storage accepts no endpoint of its own, only this flag, which
      // sends every request to a hardcoded http://localhost:20005 path-style.
      // The gateway is published on that port for this reason. The
      // flag is broken upstream and works only with the patch in
      // patches/@aws-amplify__storage@6.16.0.patch.
      ...(localEndpoint
        ? { dangerouslyConnectToHttpEndpointForTesting: "true" }
        : {}),
    },
  },
});

/**
 * Both environments redirect to the Cognito hosted UI. A deployed pool
 * federates to QUT and names it as the provider, which skips the hosted UI's
 * own form; the local pool has no federation, so it shows that form and signs
 * in the users `pnpm ministack:seed-users` writes.
 */
export const handleLogin = async () =>
  signInWithRedirect(
    localEndpoint ? undefined : { provider: { custom: "QUT" } },
  );

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
