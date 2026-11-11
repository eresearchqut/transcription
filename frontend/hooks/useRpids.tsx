import type { RpidDto } from "@eresearchqut/dmp-api";
import { useQuery } from "@tanstack/react-query";
import { getter } from "../client/fetchers";
import { useFeatures } from "./useFeatures";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseRpidsState {
  rpids: RpidDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The authenticated user's Research Project IDs (RPIDs), sourced from the
 * Data Management Planning (DMP) API via the transcription API.
 */
export const useRpids = (): UseRpidsState => {
  const { features } = useFeatures();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["rpids"],
    queryFn: async (): Promise<RpidDto[]> => {
      const rpids = await getter({ apiUrl: API_ENDPOINT, resource: "rpid" });
      if (rpids === undefined) {
        // getter resolves undefined on transient auth token failures; throw
        // so react-query retries instead of reporting an error.
        throw new Error("Auth token unavailable, retrying");
      }
      return rpids;
    },
    staleTime: 60 * 1000,
    retry: 3,
    enabled: !!features?.rpid,
  });

  return { rpids: data, isLoading, isError };
};
