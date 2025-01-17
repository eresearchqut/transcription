import { Meta, StoryObj } from "@storybook/react";
import { ExternalLink } from "./";

export default {
  title: "Components/ExternalLink",
  component: ExternalLink,
} as Meta<typeof ExternalLink>;

type Story = StoryObj<typeof ExternalLink>;

export const Primary: Story = {
  args: {
    href: "https://google.com",
    children: "Google",
  },
};
