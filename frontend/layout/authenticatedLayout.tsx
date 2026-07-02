import { signOut } from "aws-amplify/auth";
import { useRouter } from "next/router";
import type { FunctionComponent, PropsWithChildren } from "react";
import { LoadingPage } from "@/components/loadingPage";
import { useAuth } from "../context/auth-context";
import { Layout, type LayoutProps } from "./layout";

export const AuthenticatedLayout: FunctionComponent<
  PropsWithChildren<
    Pick<
      LayoutProps,
      "pageTitle" | "headerAction" | "isLanding" | "contentMaxWidth"
    >
  >
> = ({ children, ...layoutProps }) => {
  const { loading, authenticated } = useAuth();

  const router = useRouter();

  if (!loading && !authenticated) {
    router
      .push("/login")
      .then(() => console.log("Logged out, Routing to login"));
    return null;
  }

  if (loading) {
    return <LoadingPage label={"Loading..."} />;
  }

  return (
    <Layout isAuthenticated={authenticated} onLogout={signOut} {...layoutProps}>
      {children}
    </Layout>
  );
};

export default AuthenticatedLayout;
