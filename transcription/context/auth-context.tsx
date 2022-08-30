import React, {
    createContext,
    Dispatch,
    FunctionComponent,
    PropsWithChildren,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useState,
} from "react";
import Auth, {CognitoUser} from "@aws-amplify/auth";
import {authReducer, AuthReducerAction, AuthState} from "./auth-reducer";
import {useRouter} from "next/router";

type AuthContextValue = [AuthState, Dispatch<AuthReducerAction>];
const AuthContext = createContext<AuthContextValue | null>(null);

export const JWT_LOCALSTORAGE_KEY = "cognito_id_token";
export const IDENTITY_LOCALSTORAGE_KEY = "cognito_identity_id";
export const TEMP_PWD_LOCALSTORAGE_KEY = "auto_sign_in";

const AuthProvider: FunctionComponent<PropsWithChildren> = ({children}) => {
    const [state, dispatch] = useReducer(authReducer, {
        isLoading: false,
        error: undefined,
        isAuthenticated: false,
        isAuthenticating: true,
        user: undefined,
        userConfig: undefined,
    });
    const value = useMemo(() => [state, dispatch], [state]) as AuthContextValue;
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export type CognitoUserAttributes = {
    sub: string;
    'custom:qutIdentityId': string
    'custom:uid': string
};

function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    const [state, dispatch] = context;

    const setIdentityIdInLocalStorage = useCallback(async () => {
        const credentials = await Auth.currentCredentials();
        localStorage.setItem(IDENTITY_LOCALSTORAGE_KEY, credentials.identityId);
    }, []);

    const setTokenInLocalStorage = useCallback((cognitoUser: CognitoUser) => {
        localStorage.setItem(
            JWT_LOCALSTORAGE_KEY,
            cognitoUser.getSignInUserSession()?.getIdToken().getJwtToken() || ""
        );
    }, []);

    const getCurrentUser = useCallback(async () => {
        const cognitoUser = (await Auth.currentAuthenticatedUser()) as CognitoUser & {
            attributes: CognitoUserAttributes;
        };
        return cognitoUser;
    }, []);

    const initializeUser = useCallback(async () => {
        try {
            const cognitoUser = await getCurrentUser();
            const groups = (await cognitoUser.getSignInUserSession()?.getAccessToken().payload["cognito:groups"]) || [];
            setTokenInLocalStorage(cognitoUser);
            await setIdentityIdInLocalStorage();
            const {attributes} = cognitoUser;
            dispatch({
                type: "LOGIN_SUCCESS",
                userConfig: cognitoUser,
                user: {
                    username:attributes['custom:uid'],
                    id: attributes['custom:qutIdentityId'],
                    groups,
                },
            });
        } catch (e) {
            console.log(e);
            if (e instanceof Error) {
                dispatch({type: "LOGIN_FAILURE", error: e});
            } else if (JSON.stringify(e).toLowerCase().includes("no current user")) {
                dispatch({type: "LOGIN_FAILURE", error: undefined});
            } else {
                dispatch({
                    type: "LOGIN_FAILURE",
                    error: new Error(JSON.stringify(e)),
                });
            }
            localStorage.removeItem(JWT_LOCALSTORAGE_KEY);
            localStorage.removeItem(IDENTITY_LOCALSTORAGE_KEY);
        }
    }, [dispatch, getCurrentUser, setIdentityIdInLocalStorage, setTokenInLocalStorage]);


    return {
        state,
        dispatch,
        initializeUser
    };
}

function useLogout() {
    const {dispatch} = useAuth();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

    async function handleLogout() {
        try {
            setIsLoggingOut(true);
            await Auth.signOut();
            dispatch({type: "LOGOUT_SUCCESS"});
        } finally {
            localStorage.clear();
            setIsLoggingOut(false);
            await router.push("/auth/login");
        }
    }

    return {handleLogout, isLoggingOut};
}

function useLogin() {
    const {initializeUser} = useAuth();
    const router = useRouter();

    const [error, setError] = useState<Error | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

    async function handleLogin() {
        setError(null);
        setIsLoggingIn(true);
        localStorage.removeItem(TEMP_PWD_LOCALSTORAGE_KEY);
        try {
            const user = await Auth.federatedSignIn();
            initializeUser().then(() => console.log("User initialised post login"));
            router.push("/").then(() => console.log("Routing to home post login"));
            return user;
        } catch (e: any) {
            setError(e);
        } finally {
            setIsLoggingIn(false);
        }
    }

    return {error, isLoggingIn, handleLogin};
}

export const getAuthHeader = (): Record<string, string> => {
    return {['Authorization']: localStorage.getItem(JWT_LOCALSTORAGE_KEY) || ''}
};

export const getIdentityId = (): string => {
    return localStorage.getItem(IDENTITY_LOCALSTORAGE_KEY) || '';
};


export {
    AuthProvider,
    useAuth,
    useLogout,
    useLogin
};
