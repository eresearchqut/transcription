import type { Meta, StoryObj } from "@storybook/nextjs";
import type { Rpid } from "model";
import { expect, fn, mocked } from "storybook/test";
import { useRpids } from "../../hooks/useRpids";
import { ResearchPlanOptions } from "./researchPlanOptions";

const RPIDS: Rpid[] = [
  { rpid: "A1B2C3D4", title: "Oral histories of Queensland flood recovery" },
  {
    rpid: "E5F6G7H8",
    title: "Clinician interviews on remote patient monitoring",
  },
];

const meta = {
  title: "Forms/ResearchPlanOptions",
  component: ResearchPlanOptions,
  args: { onChange: fn() },
  beforeEach: () => {
    mocked(useRpids).mockReturnValue({
      rpids: RPIDS,
      isLoading: false,
      isError: false,
    });
  },
} satisfies Meta<typeof ResearchPlanOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plans: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole("combobox", {
      name: "Data Management Plan",
    });
    await expect(input).toBeRequired();
    await expect(args.onChange).toHaveBeenLastCalledWith({
      rpid: undefined,
      valid: false,
      problems: ["Select a plan."],
    });

    await userEvent.click(input);
    await userEvent.click(
      await canvas.findByRole("option", { name: /^A1B2C3D4/ }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith({
      rpid: "A1B2C3D4",
      valid: true,
      problems: [],
    });
  },
};

export const Loading: Story = {
  beforeEach: () => {
    mocked(useRpids).mockReturnValue({
      rpids: undefined,
      isLoading: true,
      isError: false,
    });
  },
  play: async ({ args }) => {
    await expect(args.onChange).toHaveBeenLastCalledWith({
      rpid: undefined,
      valid: false,
      problems: ["Wait for your research plans to load."],
    });
  },
};

export const NoPlans: Story = {
  beforeEach: () => {
    mocked(useRpids).mockReturnValue({
      rpids: [],
      isLoading: false,
      isError: false,
    });
  },
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByText("You have no active research plans."),
    ).toBeVisible();
    await expect(args.onChange).toHaveBeenLastCalledWith({
      rpid: undefined,
      valid: false,
      problems: ["You have no active research plans."],
    });
  },
};

export const Failed: Story = {
  beforeEach: () => {
    mocked(useRpids).mockReturnValue({
      rpids: undefined,
      isLoading: false,
      isError: true,
    });
  },
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByText("Your research plans could not be retrieved."),
    ).toBeVisible();
    await expect(
      canvas.getByRole("link", { name: "eresearch@qut.edu.au" }),
    ).toHaveAttribute("href", "mailto:eresearch@qut.edu.au");
    await expect(args.onChange).toHaveBeenLastCalledWith({
      rpid: undefined,
      valid: false,
      problems: ["Your research plans could not be retrieved."],
    });
  },
};
