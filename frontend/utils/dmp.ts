/** The Data Management Planning (DMP) tool, where researchers manage the plans RPIDs identify. */
export const DMP_URL = (process.env.NEXT_PUBLIC_DMP_URL ?? "").replace(
  /\/$/,
  "",
);

export const dmpPlanUrl = (rpid: string): string =>
  `${DMP_URL}/rpid/${encodeURIComponent(rpid)}`;
