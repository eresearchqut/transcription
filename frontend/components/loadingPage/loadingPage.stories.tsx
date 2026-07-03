import type { Meta, StoryObj } from "@storybook/nextjs";
import { LoadingPage } from "./loadingPage";

export default {
  title: "Component/LoadingPage",
  component: LoadingPage,
} as Meta<typeof LoadingPage>;

type Story = StoryObj<typeof LoadingPage>;

export const Default: Story = {
  args: {},
};

export const MediumWithLabel: Story = {
  args: {
    label: "Medium",
    size: "md",
  },
};
