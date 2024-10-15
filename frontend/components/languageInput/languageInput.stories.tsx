import { Meta, StoryObj } from "@storybook/react";
import { LanguageInput } from "./";

const meta = {
  title: "Components/LanguageInput",
  component: LanguageInput,
} satisfies Meta<typeof LanguageInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Multiple: Story = {
  args: {
    ...Primary.args,
    isMulti: true,
  },
};
