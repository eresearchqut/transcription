import { MediaUploadProgress } from "./mediaUploadProgress";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Components/MediaUploadProgress",
  component: MediaUploadProgress,
} satisfies Meta<typeof MediaUploadProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    uploadProgress: new Map(
      Object.entries({
        "video-1.mp4": 75,
        "video-2.mp4": 20,
        "audio.wav": 98,
      }),
    ),
  },
};
