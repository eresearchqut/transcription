import { useAuth } from "./auth-context";
import { useRouter } from "next/router";
import React, {
  ComponentPropsWithRef,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
} from "react";
import { Spinner } from "@chakra-ui/react";
import { PageProps } from "../components/layout";

export const withAuthentication = (
  WrapperComponent: FunctionComponent<PropsWithChildren<PageProps>>,
) => {
  const AuthCheck = (
    props: ComponentPropsWithRef<FunctionComponent<PropsWithChildren>>,
  ) => {
    const {
      state: { isAuthenticated, isAuthenticating },
      initializeUser,
    } = useAuth();

    useEffect(() => {
      initializeUser().then(() => console.log("Initialised user"));
    }, [initializeUser]);

    const router = useRouter();

    if (isAuthenticating) {
      return <Spinner />;
    }

    if (!isAuthenticated) {
      router
        .push("/login")
        .then(() => console.log("Logged out, Routing to login"));
      return null;
    }

    return <WrapperComponent {...props} />;
  };

  AuthCheck.displayName = WrapperComponent.displayName;
  return AuthCheck;
};

export const withAnonymous = (
  WrapperComponent: FunctionComponent<PropsWithChildren>,
) => {
  const AnonymousCheck = (
    props: ComponentPropsWithRef<FunctionComponent<PropsWithChildren>>,
  ) => {
    const {
      state: { isAuthenticated, isAuthenticating },
      initializeUser,
    } = useAuth();
    const router = useRouter();
    useEffect(() => {
      initializeUser().then(() => console.log("Initialised user"));
    }, [initializeUser]);

    if (isAuthenticating) {
      return <Spinner />;
    }

    if (isAuthenticated) {
      router
        .push("/")
        .then(() => console.log("Already logged in, routing to home."));
      return null;
    }

    // @ts-ignore
    return <WrapperComponent {...props} />;
  };

  AnonymousCheck.displayName = WrapperComponent.displayName;
  return AnonymousCheck;
};
