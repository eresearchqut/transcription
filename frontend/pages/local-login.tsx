import { VStack } from "@chakra-ui/react";
import { signIn, signOut } from "aws-amplify/auth";
import { useRouter } from "next/router";
import {
  type FunctionComponent,
  type PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { LocalLogin } from "@/components/localLogin";
import {
  handleLogin,
  type NextPageWithLayout,
  singleSignOn,
} from "@/pages/_app";
import { useAuth } from "../context/auth-context";
import Layout from "../layout/layout";

/**
 * Username and password sign-in, kept off `/login` so that page matches a
 * deployed environment. Only reachable on a local deploy, where there is no
 * hosted UI to redirect to. See `_app.tsx`.
 */
const LocalLoginPage: NextPageWithLayout = () => {
  const [signInError, setSignInError] = useState<Error | undefined>();
  const { authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (singleSignOn || authenticated) {
      router.replace("/");
    }
  }, [authenticated, router]);

  const onLogin = (username: string, password: string) =>
    signIn({
      username,
      password,
      options: { authFlowType: "USER_PASSWORD_AUTH" },
    })
      .then(() => setSignInError(undefined))
      .then(() => {
        router.push("/");
      })
      .catch((error: Error) => setSignInError(error));

  if (singleSignOn || authenticated) {
    return null;
  }

  return (
    <VStack gap={4} align={"stretch"} pb={20}>
      <LocalLogin onLogin={onLogin} error={signInError} />
    </VStack>
  );
};

const LocalLoginLayout: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
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

LocalLoginPage.getLayout = (page) => {
  return <LocalLoginLayout>{page}</LocalLoginLayout>;
};

export default LocalLoginPage;
