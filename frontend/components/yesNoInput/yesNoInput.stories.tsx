import { Meta, StoryObj } from "@storybook/react";
import { YesNoInput } from "./yesNoInput";

const meta = {
  title: "Components/YesNoInput",
  component: YesNoInput,
} satisfies Meta<typeof YesNoInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
