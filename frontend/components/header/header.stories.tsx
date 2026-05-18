import { Meta, StoryObj } from "@storybook/nextjs";
import { Header } from "./";
import { Box } from "@chakra-ui/react";

export default {
  title: "Components/Header",
  component: Header,
} as Meta<typeof Header>;

type Story = StoryObj<typeof Header>;

export const LoggedIn: Story = {
  args: {},
  render: () => (
    <Box bgColor={"brand.900"} justifyContent={"stretch"}>
      <Header isAuthenticated={true} onLogin={() => {}} onLogout={() => {}} />
    </Box>
  ),
};

export const LoggedOut: Story = {
  args: {},
  render: () => (
    <Box bgColor={"brand.900"} justifyContent={"stretch"}>
      <Header isAuthenticated={false} onLogin={() => {}} onLogout={() => {}} />
    </Box>
  ),
};
