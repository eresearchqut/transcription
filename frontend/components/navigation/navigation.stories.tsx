import Navigation from "./navigation";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Components/Navigation",
  component: Navigation,
} satisfies Meta<typeof Navigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    items: { "Upload Media": "/", "My Transcriptions": "/" },
  },
};
