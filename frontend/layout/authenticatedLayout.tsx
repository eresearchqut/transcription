import { useAuth } from "../context/auth-context";
import { useRouter } from "next/router";
import React, { FunctionComponent, PropsWithChildren } from "react";
import { Layout, LayoutProps } from "./layout";
import { signOut } from "aws-amplify/auth";
import { LoadingPage } from "@/components/loadingPage";

export const AuthenticatedLayout: FunctionComponent<PropsWithChildren<Pick<LayoutProps, 'pageTitle' | 'isLanding'>>> = (
  {children, ...layoutProps}
) => {

    const {
      loading, authenticated
    } = useAuth();

    const router = useRouter();

    if (!loading && !authenticated) {
      router
        .push("/login")
        .then(() => console.log("Logged out, Routing to login"));
      return null;
    }

    if (loading) {
      return <LoadingPage label={"Loading..."} />
    }

    return <Layout isAuthenticated={authenticated} onLogout={signOut} {...layoutProps}>{children}</Layout>;
};

export default AuthenticatedLayout;
