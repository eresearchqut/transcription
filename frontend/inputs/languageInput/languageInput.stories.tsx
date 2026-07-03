import type { Meta, StoryObj } from "@storybook/nextjs";
import { LanguageInput } from "./index";

const meta = {
  title: "Inputs/LanguageInput",
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
