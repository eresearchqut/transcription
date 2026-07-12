import type { Meta, StoryObj } from "@storybook/nextjs";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { NewFeature } from ".";

export default {
  title: "Components/NewFeatureFlag",
  component: NewFeature,
} as Meta<typeof NewFeature>;

type Story = StoryObj<typeof NewFeature>;

export const Primary: Story = {
  args: {
    show: true,
  },
  render: (args) => (
    <NewFeature {...args}>
      <Field label={"My New Field"} display={"flex"} flexDirection={"row"}>
        <Switch />
      </Field>{" "}
    </NewFeature>
  ),
};

export const NotShown: Story = {
  ...Primary,
  args: {
    show: false,
  },
};
