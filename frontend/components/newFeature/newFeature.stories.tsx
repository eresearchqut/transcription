import { Meta, StoryObj } from "@storybook/nextjs";
import { NewFeature } from ".";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

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
