import Navigation from "./navigation";
import { Meta, StoryObj } from "@storybook/react";
import { MappedIcon } from "@/components/mappedIcon";

const meta = {
  title: "Components/Navigation",
  component: Navigation,
} satisfies Meta<typeof Navigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    items: {
      "Upload Media": {
        icon: <MappedIcon icon={"upload"} />,
        url: "/",
      },
      "My Transcriptions": {
        icon: <MappedIcon icon={"playlist"} />,
        url: "/",
      },
    },
  },
};
