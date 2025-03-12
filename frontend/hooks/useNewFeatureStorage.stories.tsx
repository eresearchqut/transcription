import { Meta, StoryObj } from "@storybook/react";
import { NewFeature } from "@/components/newFeature";
import { HStack } from "@chakra-ui/react";
import { Switch } from "@/components/ui/switch";
import {
  useNewFeatureStorage,
  UseNewFeatureStorageProps,
} from "./useNewFeatureStorage";
import { Field } from "@/components/ui/field";
import { addDays } from "date-fns";

const UseNewFeatureStorageDemo = (
  props: UseNewFeatureStorageProps & { featureId: string },
) => {
  const { featureId, ...hookProps } = props;
  const { showNewFeature } = useNewFeatureStorage(hookProps);
  return (
    <NewFeature show={showNewFeature(featureId)}>
      <HStack>
        <Field label={"My New Field"} display={"flex"} flexDirection={"row"}>
          <Switch />
        </Field>
      </HStack>
    </NewFeature>
  );
};

export default {
  title: "Hooks/UseNewFeatureStorage",
  component: UseNewFeatureStorageDemo,
} as Meta<typeof UseNewFeatureStorageDemo>;

type Story = StoryObj<typeof UseNewFeatureStorageDemo>;

const tomorrow = addDays(new Date(), 1).toISOString();
const yesterday = addDays(new Date(), -1).toISOString();

export const Primary: Story = {
  args: {
    featureId: "FEAT-1",
    identityId: "1abcd",
    features: {
      "FEAT-1": { displayExpiry: tomorrow, displayDuration: { weeks: 2 } },
    },
  },
};

export const Expired: Story = {
  args: {
    ...Primary.args,
    featureId: "FEAT-1",
    features: {
      "FEAT-1": { displayExpiry: yesterday, displayDuration: { weeks: 2 } },
    },
  },
};

export const SeenWithinDuration: Story = {
  args: {
    ...Primary.args,
    featureId: "FEAT-1",
    features: {
      "FEAT-1": { displayExpiry: yesterday, displayDuration: { days: -1 } },
    },
  },
};

export const NotCurrentFeature: Story = {
  args: {
    ...Primary.args,
    featureId: "FEAT-OLD",
    features: {
      "FEAT-1": { displayExpiry: yesterday, displayDuration: { days: -1 } },
    },
  },
};
