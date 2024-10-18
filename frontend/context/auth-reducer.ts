import type { CognitoUser } from "@aws-amplify/auth";

export type User = {
  username: string;
  id: string;
  groups: string[];
};

export type AuthState = {
  isLoading: boolean;
  error: Error | undefined;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  user: User | undefined;
  userConfig: CognitoUser | undefined;
};

export type AuthReducerAction =
  | { type: "IS_LOGGING_IN" }
  | { type: "LOGIN_SUCCESS"; user: User; userConfig: CognitoUser }
  | { type: "LOGIN_FAILURE"; error: Error | undefined }
  | { type: "LOGOUT_SUCCESS" };

const initialState = {
  isLoading: true,
  error: undefined,
  isAuthenticated: false,
  isAuthenticating: true,
  user: undefined,
  userConfig: undefined,
};

export function authReducer(
  state: AuthState,
  action: AuthReducerAction,
): AuthState {
  switch (action.type) {
    case "IS_LOGGING_IN": {
      return initialState;
    }
    case "LOGIN_SUCCESS": {
      return {
        isLoading: false,
        error: undefined,
        isAuthenticated: true,
        isAuthenticating: false,
        user: action.user,
        userConfig: action.userConfig,
      };
    }
    case "LOGIN_FAILURE": {
      return {
        ...initialState,
        isLoading: false,
        error: action.error,
        isAuthenticating: false,
      };
    }
    case "LOGOUT_SUCCESS": {
      return {
        ...initialState,
        isLoading: false,
        isAuthenticating: false,
      };
    }
    default: {
      throw new Error(`Unsupported action type: ${JSON.stringify(action)}`);
    }
  }
}
