import { Meta, StoryObj } from "@storybook/react";
import { Quotas } from "./index";

const meta = {
  title: "Components/Quotas",
  component: Quotas,
} satisfies Meta<typeof Quotas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    minimumDuration: { seconds: 5 },
    maximumDuration: { hours: 4 },
    maximumFileSizeBytes: 1000 * 1000 * 2,
    storageDuration: { days: 14 },
    supportedFileFormats: [
      "wav",
      "flac",
      "amr",
      "3ga",
      "mp3",
      "mp4",
      "m4a",
      "oga",
      "ogg",
      "opus",
    ],
  },
};

export const AsText: Story = {
  args: {
    ...Primary.args,
    asTextOnly: true,
  },
};
