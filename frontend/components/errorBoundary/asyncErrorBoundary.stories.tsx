import type { Meta, StoryObj } from "@storybook/react";
import { AsyncErrorBoundary } from "./";
import { Text } from "@chakra-ui/react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorMessage } from "@/components/errorMessage";

export default {
  title: "Components/AsyncErrorBoundary",
  component: AsyncErrorBoundary,
  parameters: {
    layout: "centered",
  },
} as Meta<typeof AsyncErrorBoundary>;
type Story = StoryObj<typeof AsyncErrorBoundary>;

const ErrorComponent = () => {
  throw new Error("Test error");
};

const PromiseRejectComponent = () => {
  new Promise((_, reject) => {
    reject(new Error("Unexpected promise rejection"));
  }).then();
  return <></>;
};

export const Default: Story = {
  args: {
    children: <ErrorComponent />,
  },
  render: (args) => (
    <ErrorBoundary FallbackComponent={ErrorMessage}>
      <AsyncErrorBoundary {...args} />
    </ErrorBoundary>
  ),
};

export const WithPromiseRejection: Story = {
  ...Default,
  args: {
    children: <PromiseRejectComponent />,
  },
};

export const WithNoErrors: Story = {
  ...Default,
  args: {
    children: <Text>Success, no errors!</Text>,
  },
};
