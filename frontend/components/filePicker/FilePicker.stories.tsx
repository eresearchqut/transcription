import type { Meta, StoryObj } from "@storybook/react";
import FilePicker, { FilePickerState } from "./FilePicker";

const meta = {
  title: "Component/FilePicker",
  component: FilePicker,
} satisfies Meta<typeof FilePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    onFilesPicked: console.log,
  },
};

export const Accept: Story = {
  args: {
    ...Primary.args,
    accept: {
      "image/png": [".png"],
      "text/html": [".html", ".htm"],
    },
  },
};

export const MaxFiles: Story = {
  args: { ...Primary.args, maxFiles: 10 },
};

export const MaxSize: Story = {
  args: { ...Primary.args, maxSize: 1048576 },
};

export const OneLargeZip: Story = {
  args: {
    ...Primary.args,
    accept: {
      "application/zip": [".zip", ".rar"],
    },
    maxSize: 10485760,
    maxFiles: 1,
  },
};
