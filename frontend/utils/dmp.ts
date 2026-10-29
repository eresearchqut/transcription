import type { RpidDto } from "@eresearchqut/dmp-api";

/** The Data Management Planning (DMP) tool, where researchers manage the plans RPIDs identify. */
export const DMP_URL = (process.env.NEXT_PUBLIC_DMP_URL ?? "").replace(
  /\/$/,
  "",
);

export const dmpPlanUrl = (rpid: string): string =>
  `${DMP_URL}/rpid/${encodeURIComponent(rpid)}`;

/**
 * The selected RPID while it is still one of the user's active plans. A refetch
 * can drop it, for example when its plan is archived after it was selected.
 */
export const activeRpid = (
  rpids: RpidDto[] | undefined,
  rpid: string | undefined,
): string | undefined =>
  rpids?.some((dto) => dto.rpid === rpid) ? rpid : undefined;
