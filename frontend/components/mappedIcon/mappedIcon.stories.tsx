import { Meta, StoryObj } from "@storybook/react";
import MappedIcon from "./mappedIcon";

export default {
  title: "Components/MappedIcon",
  component: MappedIcon,
} as Meta<typeof MappedIcon>;

type Story = StoryObj<typeof MappedIcon>;

export const CheckCircle: Story = { args: { icon: "check-circle" } };
export const ChevronDown: Story = { args: { icon: "chevron-down" } };
export const ChevronLeft: Story = { args: { icon: "chevron-left" } };
export const ChevronRight: Story = { args: { icon: "chevron-right" } };
export const Clock: Story = { args: { icon: "clock" } };
export const ClockExclamation: Story = { args: { icon: "clock-exclamation" } };
export const DoubleArrowLeft: Story = { args: { icon: "double-arrow-left" } };
export const DoubleArrowRight: Story = { args: { icon: "double-arrow-right" } };
export const EnterOutline: Story = { args: { icon: "enter-outline" } };
export const ExclamationCircle: Story = {
  args: { icon: "exclamation-circle" },
};
export const ExitOutline: Story = { args: { icon: "exit-outline" } };
export const ExternalLink: Story = { args: { icon: "external-link" } };
export const File: Story = { args: { icon: "file" } };
export const FileCheck: Story = { args: { icon: "file-check" } };
export const FileAlert: Story = { args: { icon: "file-alert" } };
export const PlayOutlineSquare: Story = {
  args: { icon: "play-outline-square" },
};
export const Plus: Story = { args: { icon: "plus" } };
export const QuestionCircle: Story = { args: { icon: "question" } };
export const Search: Story = { args: { icon: "search" } };
export const TriangleDown: Story = { args: { icon: "triangle-down" } };
export const TriangleUp: Story = { args: { icon: "triangle-up" } };
export const Upload: Story = { args: { icon: "upload" } };
