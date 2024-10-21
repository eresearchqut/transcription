import {
  FileTranscriptionProgress,
  TranscriptionJobStatusE,
} from "./fileTranscriptionProgress";
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
    transcriptionProgress: undefined,
  },
};

export const FileUploading: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 25,
    transcriptionProgress: undefined,
  },
};

export const FileTranscriptionUnknownStatus: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: undefined },
  },
};

export const FileTranscriptionQueued: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatusE.QUEUED },
  },
};

export const FileTranscriptionInProgress: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatusE.IN_PROGRESS },
  },
};

export const TranscriptionCompleted: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatusE.COMPLETED },
  },
};

export const TranscriptionFailed: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatusE.FAILED },
  },
};
