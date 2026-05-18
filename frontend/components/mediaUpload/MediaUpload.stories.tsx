import { MediaUpload } from "../mediaUpload";
import { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Forms/MediaUpload",
  component: MediaUpload,
} satisfies Meta<typeof MediaUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    onSubmit: () => {
      console.log("submitted");
    },
  },
};
