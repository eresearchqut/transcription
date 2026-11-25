import type { Meta, StoryObj } from "@storybook/nextjs";
import type { Rpid } from "model";
import { expect, fn, mocked } from "storybook/test";
import { useFeatures } from "../../hooks/useFeatures";
import { useRpids } from "../../hooks/useRpids";
import { MediaUpload } from "../mediaUpload";

const RPIDS: Rpid[] = [
  { rpid: "A1B2C3D4", title: "Oral histories of Queensland flood recovery" },
  {
    rpid: "E5F6G7H8",
    title: "Clinician interviews on remote patient monitoring",
  },
];

const meta = {
  title: "Forms/MediaUpload",
  component: MediaUpload,
  args: { onSubmit: fn() },
  beforeEach: () => {
    mocked(useFeatures).mockReturnValue({
      features: { rpid: true },
      isLoading: false,
      isError: false,
    });
    mocked(useRpids).mockReturnValue({
      rpids: RPIDS,
      isLoading: false,
      isError: false,
    });
  },
} satisfies Meta<typeof MediaUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const RpidFeatureOff: Story = {
  name: "RPID feature off",
  beforeEach: () => {
    mocked(useFeatures).mockReturnValue({
      features: { rpid: false },
      isLoading: false,
      isError: false,
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Get started" }));
    await expect(
      canvas.queryByRole("tab", { name: /Choose plan/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("tab", { name: /Choose options/ }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

export const FeaturesLoading: Story = {
  beforeEach: () => {
    mocked(useFeatures).mockReturnValue({
      features: undefined,
      isLoading: true,
      isError: false,
    });
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Get started/ }),
    ).toBeDisabled();
  },
};

export const RequiredFields: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const next = () => canvas.getByRole("button", { name: "Next" });

    await userEvent.click(canvas.getByRole("button", { name: "Get started" }));

    await step("A research plan is required", async () => {
      await expect(
        canvas.getByRole("tab", { name: /Choose plan/ }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(next()).toHaveAttribute("aria-disabled", "true");
      await expect(next()).toHaveAccessibleDescription("Select a plan.");
      await userEvent.click(next());
      await expect(
        canvas.getByRole("tab", { name: /Choose plan/ }),
      ).toHaveAttribute("aria-selected", "true");
    });

    await step("Choosing a plan allows the next step", async () => {
      await userEvent.click(
        canvas.getByRole("combobox", {
          name: "Data Management Plan",
        }),
      );
      await userEvent.click(
        await canvas.findByRole("option", { name: /^A1B2C3D4/ }),
      );
      await expect(next()).toHaveAttribute("aria-disabled", "false");
      await userEvent.click(next());
      await expect(
        canvas.getByRole("tab", { name: /Choose options/ }),
      ).toHaveAttribute("aria-selected", "true");
    });

    await step("At least one source language is required", async () => {
      const languages = canvas.getByRole("combobox", {
        name: "Source languages",
      });
      await expect(languages).toBeRequired();
      await userEvent.click(languages);
      await userEvent.keyboard("{Backspace}{Escape}");
      await expect(languages).toBeInvalid();
      await expect(languages).toHaveAccessibleDescription(
        /Select at least one language\./,
      );
      await expect(next()).toHaveAccessibleDescription(
        "Select at least one source language.",
      );
    });
  },
};
