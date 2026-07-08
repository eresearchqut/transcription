import {
  type AuthSession,
  fetchAuthSession,
  fetchUserAttributes,
  signOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/router";
import {
  createContext,
  type FunctionComponent,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { LoadingPage } from "@/components/loadingPage";
import { useAnalytics } from "./analytics-context";
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
};

export interface AuthContextOperations {
  getCurrentSession: () => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextState & AuthContextOperations>({
  ...DefaultAuthContextState,
  getCurrentSession: () =>
    Promise.reject(new Error("Invalid State: Session Not Initialised")),
});

export const useAuth = (): AuthContextState & AuthContextOperations => {
  return useContext<AuthContextState & AuthContextOperations>(AuthContext);
};

const AuthProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<AuthContextState>({
    ...DefaultAuthContextState,
  });
  const { identify } = useAnalytics();
  const { setAttributes } = useMonitoring();

  useEffect(() => {
    fetchUserAttributes()
      .then((userAttributes) => {
        const { "custom:qutIdentityId": id, "custom:uid": username } =
          userAttributes as UserAttributes;
        setState((current) => ({
          ...current,
          user: { username, id },
          loading: false,
          authenticated: true,
        }));
      })
      .catch(() => {
        setState(() => ({
          loading: false,
          authenticated: false,
          user: undefined,
        }));
      });
  }, []);

  const getCurrentSession = useCallback(async () => {
    const authSession = await fetchAuthSession();
    if (state.authenticated && authSession.identityId === undefined) {
      await signOut();
    }
    return authSession;
  }, [state.authenticated]);

  useEffect(() => {
    if (state.user?.id) {
      setAttributes({
        "auth.username": state.user?.username,
      });
      identify(state.user?.id);
    }
  }, [state, identify, setAttributes]);

  const router = useRouter();

  useEffect(() => {
    const handleAuthEvents = async (data: { payload: { event: string } }) => {
      const { event } = data.payload;
      switch (event) {
        case "signedOut":
          setState({ loading: false, authenticated: false, user: undefined });
          await router.push("/login");
          break;
        case "tokenRefresh_failure":
          // A single failed silent token refresh is usually transient (e.g. a
          // network blip while the page polls for job progress). Don't force a
          // logout here: requests skip and retry, and Amplify refreshes again
          // on the next attempt. A genuine session loss still arrives as a
          // `signedOut` event and is handled above.
          console.debug("Token refresh failed; will retry on next request");
          break;
        default:
          console.debug("Unhandled Auth Event:", event);
      }
    };
    // Subscribe to Auth events
    return Hub.listen("auth", handleAuthEvents);
  }, [router.push]);

  if (state.loading) {
    return <LoadingPage label={"Loading..."} />;
  }

  return (
    <AuthContext.Provider value={{ ...state, getCurrentSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
