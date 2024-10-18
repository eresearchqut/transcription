import { Meta, StoryObj } from "@storybook/react";
import { PiiInput } from "./index";

const meta = {
  title: "Inputs/PiiInput",
  component: PiiInput,
} satisfies Meta<typeof PiiInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
