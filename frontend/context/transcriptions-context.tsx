import type { Transcription } from "model";
import {
  type Context,
  createContext,
  type FunctionComponent,
  type PropsWithChildren,
  useEffect,
  useState,
} from "react";
import { getter } from "../client/fetchers";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface TranscriptionsContextState {
  transcriptionsLoading: boolean;
  transcriptions: Transcription[];
}

export type TranscriptionsContextOperations = NonNullable<unknown>;

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

  useEffect(() => {
    getter({ apiUrl: API_ENDPOINT, resource: "transcription" }).then((data) => {
      setState((current) => ({
        ...current,
        transcriptions: data,
        transcriptionsLoading: false,
      }));
    });
  }, []);

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
