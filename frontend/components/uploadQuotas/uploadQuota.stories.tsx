import UploadQuota from "./uploadQuota";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "Components/FileUploadRequirements",
  component: UploadQuota,
} satisfies Meta<typeof UploadQuota>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    minimumDuration: "5 seconds",
    maximumDuration: "4 hours",
  },
};
