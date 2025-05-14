import React, {
  createContext,
  Dispatch,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  authReducer,
  AuthReducerAction,
  AuthState,
  User,
} from "./auth-reducer";
import { useRouter } from "next/router";
import {
  fetchAuthSession,
  fetchUserAttributes,
  JWT,
  signInWithRedirect,
  signOut,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

type AuthContextValue = [AuthState, Dispatch<AuthReducerAction>];
const AuthContext = createContext<AuthContextValue | null>(null);

export const JWT_LOCALSTORAGE_KEY = "cognito_id_token";
export const IDENTITY_LOCALSTORAGE_KEY = "cognito_identity_id";

const AuthProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isLoading: false,
    error: undefined,
    isAuthenticated: false,
    isAuthenticating: true,
    user: undefined,
    userConfig: undefined,
  });
  const value = useMemo(() => [state, dispatch], [state]) as AuthContextValue;
  const router = useRouter();

  useEffect(() => {
    const handleAuthEvents = async (data: { payload: { event: string } }) => {
      const { event } = data.payload;

      switch (event) {
        case "tokenRefresh_failure":
        case "signedOut":
          localStorage.clear();
          await router.push("/login");
          break;
        default:
          console.debug("Unhandled Auth Event:", event);
      }
    };

    // Subscribe to Auth events
    Hub.listen("auth", handleAuthEvents);
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export type CognitoUserAttributes = {
  sub: string;
  "custom:qutIdentityId": string;
  "custom:uid": string;
};

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  const [state, dispatch] = context;

  const setIdentityIdInLocalStorage = useCallback((identityId: string | undefined) => {
      localStorage.setItem(IDENTITY_LOCALSTORAGE_KEY, identityId ?? "");
  }, []);

  const setTokenInLocalStorage = useCallback((jwtToken: JWT | undefined) => {
    localStorage.setItem(JWT_LOCALSTORAGE_KEY, jwtToken?.toString() ?? "");
  }, []);

  const getCurrentSession = useCallback(async () => {
    const authSession = await fetchAuthSession();
    if (state.isAuthenticated && authSession.identityId === undefined) {
      await signOut();
    }
    return authSession;
  }, []);

  const initializeUser = useCallback(async () => {
    try {
      const authSession = await getCurrentSession();
      const { identityId, tokens } = authSession;

      setTokenInLocalStorage(tokens?.idToken);
      setIdentityIdInLocalStorage(identityId);

      const attributes = (await fetchUserAttributes()) as CognitoUserAttributes;
      const groups = tokens?.accessToken?.payload?.["cognito:groups"] || [];

      dispatch({
        type: "LOGIN_SUCCESS",
        userConfig: authSession,
        user: {
          username: attributes["custom:uid"],
          id: attributes["custom:qutIdentityId"],
          groups,
        } as User,
      });
    } catch (e) {
      if (e instanceof Error) {
        dispatch({
          type: "LOGIN_FAILURE",
          error: e.message.toLowerCase().includes("no current user")
            ? undefined
            : e,
        });
      } else {
        dispatch({
          type: "LOGIN_FAILURE",
          error: new Error(JSON.stringify(e)),
        });
      }
      localStorage.removeItem(JWT_LOCALSTORAGE_KEY);
      localStorage.removeItem(IDENTITY_LOCALSTORAGE_KEY);
    }
  }, [dispatch, setTokenInLocalStorage, setIdentityIdInLocalStorage]);

  return {
    state,
    dispatch,
    initializeUser,
    getCurrentSession,
  };
}

function useLogin() {
  const { initializeUser } = useAuth();

  const [error, setError] = useState<Error | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  async function handleLogin() {
    setError(null);
    setIsLoggingIn(true);
    try {
      const user = await signInWithRedirect({ provider: { custom: "QUT" } });
      initializeUser().then(() => console.log("User initialised post login"));
      return user;
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoggingIn(false);
    }
  }

  return { error, isLoggingIn, handleLogin };
}

export { AuthProvider, useAuth, useLogin };
