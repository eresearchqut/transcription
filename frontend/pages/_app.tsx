import "../styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "../context/auth-context";
import { Amplify } from "aws-amplify";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "@/components/ui/provider";
import Layout from "../layout/layout";
import { ReactElement, ReactNode } from "react";
import { NextPage } from "next";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
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

const queryClient = new QueryClient();

function App({ Component, pageProps }: AppPropsWithLayout) {
  const { pageTitle, isLanding, ...componentProps } = pageProps;
  const getLayout =
    Component.getLayout ??
    ((page) => (
      <Layout isLanding={isLanding} pageTitle={pageTitle}>
        {page}
      </Layout>
    ));
  return (
    <Provider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {getLayout(<Component {...componentProps} />)}
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
