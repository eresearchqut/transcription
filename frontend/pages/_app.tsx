import "../styles/globals.css";
import type { AppProps } from "next/app";
import theme from "../components/theme";
import { ChakraProvider } from "@chakra-ui/react";
import { LayoutTree } from "@moxy/next-layout";
import { AuthProvider } from "../context/auth-context";
import { Amplify } from "aws-amplify";

const data = {
  NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID:
    process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
  NEXT_PUBLIC_AUTH_USER_POOL_ID: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
  NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID:
    process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
  NEXT_PUBLIC_AUTH_DOMAIN: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT:
    process.env.NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT,
  NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT:
    process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT,
  NEXT_PUBLIC_TRANSCRIPTION_BUCKET:
    process.env.NEXT_PUBLIC_TRANSCRIPTION_BUCKET,
};
console.log({ data });

Amplify.configure({
  Auth: {
    identityPoolId: process.env.NEXT_PUBLIC_AUTH_IDENTITY_POOL_ID,
    region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2",
    userPoolId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_AUTH_USER_POOL_CLIENT_ID,
    mandatorySignIn: true,
    oauth: {
      domain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
      scope: [
        "phone",
        "email",
        "profile",
        "openid",
        "aws.cognito.signin.user.admin",
      ],
      redirectSignIn: process.env.NEXT_PUBLIC_AUTH_SIGN_IN_REDIRECT,
      redirectSignOut: process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_REDIRECT,
      responseType: "token",
    },
  },
  Storage: {
    AWSS3: {
      bucket: process.env.NEXT_PUBLIC_TRANSCRIPTION_BUCKET,
      region: process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2",
    },
  },
});

function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <LayoutTree Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
