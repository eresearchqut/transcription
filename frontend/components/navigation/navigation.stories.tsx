import type { Meta, StoryObj } from "@storybook/nextjs";
import { MappedIcon } from "@/components/mappedIcon";
import Navigation from "./navigation";

const meta = {
  title: "Components/Navigation",
  component: Navigation,
} satisfies Meta<typeof Navigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    items: {
      Home: {
        icon: <MappedIcon icon={"home"} />,
        url: "/login",
      },
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
