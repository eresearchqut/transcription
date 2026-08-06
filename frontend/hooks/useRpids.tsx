import { useQuery } from "@tanstack/react-query";
import type { Rpid } from "model";
import { getter } from "../client/fetchers";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseRpidsState {
  rpids: Rpid[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The authenticated user's Research Project IDs (RPIDs), sourced from the
 * Data Management Planning (DMP) API via the transcription API.
 */
export const useRpids = (): UseRpidsState => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rpids"],
    queryFn: async (): Promise<Rpid[]> => {
      const rpids = await getter({ apiUrl: API_ENDPOINT, resource: "rpid" });
      if (rpids === undefined) {
        // getter resolves undefined on transient auth token failures; throw
        // so react-query retries instead of reporting an error.
        throw new Error("Auth token unavailable, retrying");
      }
      return rpids;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  return { rpids: data, isLoading, isError };
};
