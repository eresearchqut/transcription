import Navigation from "./navigation";
import { Meta, StoryObj } from "@storybook/react";
import { LuUpload } from "react-icons/lu";
import { RiPlayList2Fill } from "react-icons/ri";

const meta = {
  title: "Components/Navigation",
  component: Navigation,
} satisfies Meta<typeof Navigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    items: {
      "Upload Media": { icon: <LuUpload />, url: "/" },
      "My Transcriptions": { icon: <RiPlayList2Fill />, url: "/" },
    },
  },
};
