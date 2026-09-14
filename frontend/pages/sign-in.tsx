import { Box } from "@chakra-ui/react";
import { signOut } from "aws-amplify/auth";
import type { GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  type FunctionComponent,
  type PropsWithChildren,
  useEffect,
} from "react";
import { LocalLogin } from "@/components/localLogin";
import { handleLogin, type NextPageWithLayout } from "@/pages/_app";
import { useAuth } from "../context/auth-context";
import Layout from "../layout/layout";

/**
 * Stands in for the Cognito hosted UI, which needs TLS and the QUT identity
 * provider and so cannot be reached from a local deploy. Sign-in is a page of
 * its own here for the same reason it is a redirect there: the landing page
 * describes the service, and signing in is a step away from it that lands back
 * in the app.
 *
 * Only a local deploy sets an emulator endpoint. `next.config.js` gives it a
 * build-time value either way, so a deployed build folds the form away and
 * leaves the component out of the bundle, while `getStaticProps` below leaves
 * the route out of the export.
 */
const localSignIn = !!process.env.NEXT_PUBLIC_AWS_ENDPOINT;

const SignIn: NextPageWithLayout = () => {
  const { authenticated } = useAuth();
  const router = useRouter();

  // Signing in raises an Amplify `signedIn` event, which the auth context turns
  // into an authenticated session. Follow it into the app, the way the hosted
  // UI returns to the configured redirect.
  useEffect(() => {
    if (authenticated) {
      void router.replace("/");
    }
  }, [authenticated, router]);

  return localSignIn ? (
    <Box maxW={"md"} mx={"auto"}>
      <LocalLogin />
    </Box>
  ) : null;
};

const SignInLayout: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { authenticated } = useAuth();

  return (
    <Layout
      isLanding={true}
      isAuthenticated={authenticated}
      onLogin={handleLogin}
      onLogout={signOut}
    >
      {children}
    </Layout>
  );
};

SignIn.getLayout = (page) => {
  return <SignInLayout>{page}</SignInLayout>;
};

/**
 * A deployed export writes no HTML for a page whose `getStaticProps` returns
 * `notFound`, so the route is absent from the distribution bucket and the edge
 * function's `/sign-in` to `/sign-in.html` rewrite finds nothing to serve.
 */
export const getStaticProps: GetStaticProps = async () =>
  localSignIn ? { props: {} } : { notFound: true };

export default SignIn;
