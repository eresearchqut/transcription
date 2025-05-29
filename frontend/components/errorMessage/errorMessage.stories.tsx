import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./";
import { ErrorBoundary } from "react-error-boundary";

export default {
  title: "Components/ErrorMessage",
  component: ErrorMessage,
} as Meta<typeof ErrorMessage>;

type Story = StoryObj<typeof ErrorMessage>;

const ErrorComponent = () => {
  throw new Error("Test error");
};

export const Default: Story = {
  render: (args) => (
    <ErrorBoundary fallback={<ErrorMessage {...args} />}>
      <ErrorComponent />
    </ErrorBoundary>
  ),
};

export const WithTitle: Story = {
  ...Default,
  args: {
    title: "Oh no!",
    message: "Something went wrong. Please try again later.",
  },
};
