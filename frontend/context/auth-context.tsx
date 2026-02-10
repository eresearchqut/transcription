import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback, useContext,
  useEffect,
  useState
} from "react";

import { useRouter } from "next/router";
import {
  fetchAuthSession,
  fetchUserAttributes,
  signOut,
  AuthSession
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useAnalytics } from "./analytics-context";
import { LoadingPage } from "@/components/loadingPage";
import { useMonitoring } from "./monitoring-context";

export type UserAttributes = {
  "custom:qutIdentityId": string;
  "custom:uid": string;
};

export interface User {
  username: string;
  id: string;
}

export interface AuthContextState {
  authenticated: boolean;
  loading: boolean;
  user?: User;
}

export const DefaultAuthContextState = {
  loading: true,
  authenticated: false,
  user: undefined,
}

export interface AuthContextOperations {
  getCurrentSession: () => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextState & AuthContextOperations>({
  ...DefaultAuthContextState,
  getCurrentSession: () =>
    Promise.reject(new Error("Invalid State: Session Not Initialised"))
});

export const useAuth = (): AuthContextState & AuthContextOperations => {
  return useContext<AuthContextState & AuthContextOperations>(AuthContext);
};

const AuthProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {

  const [state, setState] = useState<AuthContextState>({...DefaultAuthContextState});
  const {identify} = useAnalytics();
  const {setAttributes} = useMonitoring();

  useEffect(() => {
    fetchUserAttributes().then((userAttributes) => {
      const { "custom:qutIdentityId": id, "custom:uid": username } = userAttributes as UserAttributes;
      setState((current) => ({
        ...current,
        user: { username, id },
        loading: false,
        authenticated: true,
      }));
    }).catch(() => {
      setState({...DefaultAuthContextState, loading: false})
    })
  }, []);

  const getCurrentSession = useCallback(async () => {
    const authSession = await fetchAuthSession();
    if (state.authenticated && authSession.identityId === undefined) {
      await signOut();
    }
    return authSession;
  }, []);

  useEffect(() => {
    if (state.user?.id) {
      setAttributes({
        "auth.username": state.user?.username,
      });
      identify(state.user?.id);
    }
  }, [state.user?.id, setAttributes, identify]);

  const router = useRouter();

  useEffect(() => {
    const handleAuthEvents = async (data: { payload: { event: string } }) => {
      const { event } = data.payload;
      switch (event) {
        case "tokenRefresh_failure":
        case "signedOut":
          await router.push("/login");
          break;
        default:
          console.debug("Unhandled Auth Event:", event);
      }
    };
    // Subscribe to Auth events
    return Hub.listen("auth", handleAuthEvents);
  }, []);

  if (state.loading) {
    return <LoadingPage label={"Loading..."} />
  }

  return <AuthContext.Provider value={{...state, getCurrentSession}}>{children}</AuthContext.Provider>;
};

export { AuthProvider, AuthContext };
