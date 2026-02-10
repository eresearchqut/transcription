import { add, Duration } from "date-fns";
import { get, keys, pick } from "lodash";

interface FeatureDisplayConfig {
  displayExpiry: string;
  displayDuration?: Duration;
}

interface UserStorage {
  seen: string;
}

export interface UseNewFeatureStorageProps {
  features: Record<string, FeatureDisplayConfig>;
  identityId?: string;
}

export interface UseNewFeatureStorageContext {
  showNewFeature: (featureId: string) => boolean;
}

const DEFAULT_DISPLAY_DURATION = { weeks: 2 };

export const useNewFeatureStorage = (
  props: UseNewFeatureStorageProps,
): UseNewFeatureStorageContext => {
  const { features, identityId } = props;

  const currentIsoDate = new Date().toISOString();
  const storageKey = `features.${identityId}`;
  const userStorageItem = localStorage.getItem(storageKey);
  const userSeenFeatures: UserStorage = userStorageItem
    ? JSON.parse(userStorageItem)
    : {};
  const currentUserSeenFeatures = pick(userSeenFeatures, keys(features));

  const showNewFeature = (featureId: string) => {
    if (identityId === undefined) return false;

    const userFeature = get(currentUserSeenFeatures, featureId, {
      firstSeen: currentIsoDate,
    });

    const feature: FeatureDisplayConfig = get(features, featureId);

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...currentUserSeenFeatures,
        ...(feature && { [featureId]: userFeature }),
      }),
    );

    const displayDuration =
      feature?.displayDuration ?? DEFAULT_DISPLAY_DURATION;
    const userDisplayExpiry = add(
      userFeature.firstSeen,
      displayDuration,
    ).toISOString();

    return (
      feature &&
      currentIsoDate < feature.displayExpiry &&
      currentIsoDate < userDisplayExpiry
    );
  };

  return {
    showNewFeature,
  };
};
