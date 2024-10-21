import { FileTranscriptionProgress } from "./fileTranscriptionProgress";
import { Meta, StoryObj } from "@storybook/react";
import { TranscriptionJobStatus } from "../../hooks/useTranscriptions";

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
    transcriptionProgress: { status: TranscriptionJobStatus.QUEUED },
  },
};

export const FileTranscriptionInProgress: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatus.IN_PROGRESS },
  },
};

export const TranscriptionCompleted: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatus.COMPLETED },
  },
};

export const TranscriptionFailed: Story = {
  args: {
    ...Primary.args,
    uploadProgress: 100,
    transcriptionProgress: { status: TranscriptionJobStatus.FAILED },
  },
};
