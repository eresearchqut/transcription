import { Meta, StoryObj } from "@storybook/nextjs";
import { HelpPopover } from "./";
import { Text } from "@chakra-ui/react";

export default {
  title: "Components/HelpPopover",
  component: HelpPopover,
} as Meta<typeof HelpPopover>;

type Story = StoryObj<typeof HelpPopover>;

export const Default: Story = {
  args: {
    ariaLabel: "Help",
    header: "Help and Information",
    children: <Text>This is some help text</Text>,
  },
};
