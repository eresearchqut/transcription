import { useQuery } from "@tanstack/react-query";
import type { FeatureFlags } from "model";

const API_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

export interface UseFeaturesState {
  /** Undefined while the flags load, and when they couldn't be. */
  features: FeatureFlags | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The features that are on. They can change while the service runs, so they
 * are fetched rather than built in, and fetched again once they are a minute
 * old. The request needs no token, so pages shown before sign-in can use it.
 */
export const useFeatures = (): UseFeaturesState => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["features"],
    queryFn: async (): Promise<FeatureFlags> => {
      const response = await fetch(`${API_ENDPOINT}/features`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch the feature flags: ${response.status}`,
        );
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  return { features: data, isLoading, isError };
};
