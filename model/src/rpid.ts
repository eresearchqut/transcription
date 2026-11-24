/**
 * One of the user's active plans in the Data Management Planner, as
 * `GET /rpid` lists it. The API copies these fields from the DMP's response,
 * so a field the DMP adds doesn't reach the browser.
 */
export interface Rpid {
  rpid: string;
  title: string;
}
