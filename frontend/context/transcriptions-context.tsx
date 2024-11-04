import {
  Context,
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { Transcription } from "../model";
import { getter } from "../client/fetchers";
import { useLogout } from "./auth-context";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface TranscriptionsContextState {
  transcriptionsLoading: boolean;
  transcriptions: Transcription[];
}

export interface TranscriptionsContextOperations {}

export const TranscriptionsContext: Context<
  TranscriptionsContextState & TranscriptionsContextOperations
> = createContext(
  {} as TranscriptionsContextState & TranscriptionsContextOperations,
);

export const TranscriptionsContextProvider: FunctionComponent<
  PropsWithChildren
> = ({ children }) => {
  const [state, setState] = useState<TranscriptionsContextState>({
    transcriptionsLoading: true,
    transcriptions: [],
  });

  const [error, setError] = useState();
  const { handleLogout } = useLogout();

  useEffect(() => {
    getter({ apiUrl: API_ENDPOINT, resource: "transcription" })
      .then((data) => {
        setState((current) => ({
          ...current,
          transcriptions: data,
          transcriptionsLoading: false,
        }));
      })
      .catch((e) => {
        setError(e);
      });
  }, []);

  useEffect(() => {
    if (error) {
      handleLogout().then();
    }
  }, [error, handleLogout]);

  return (
    <TranscriptionsContext.Provider
      value={{
        ...state,
      }}
    >
      {children}
    </TranscriptionsContext.Provider>
  );
};
