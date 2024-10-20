import { FileTranscriptionProgress } from "./fileTranscriptionProgress";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Components/FileTranscriptionProgress",
  component: FileTranscriptionProgress,
} satisfies Meta<typeof FileTranscriptionProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    filename: "video-1.mp4",
    uploadProgress: 0,
    transcriptionProgress: 0,
  },
};

export const FileUploading: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 25,
    transcriptionProgress: 0,
  },
};

export const FileTranscribing: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: 0,
  },
};

export const Completed: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: 100,
  },
};
