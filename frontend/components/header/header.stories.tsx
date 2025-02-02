import { Meta, StoryObj } from "@storybook/react";
import { Header } from "./";
import { Box } from "@chakra-ui/react";

export default {
  title: "Components/Header",
  component: Header,
} as Meta<typeof Header>;

type Story = StoryObj<typeof Header>;

export const Primary: Story = {
  args: {},
  render: () => (
    <Box bgColor={"brand.900"} justifyContent={"stretch"}>
      <Header />
    </Box>
  ),
};
