export interface RpidResearcher {
  id?: string;
  name?: string;
  title?: string;
  preferredName?: string;
}

export interface RpidOrganisation {
  id?: string | number;
  name?: string;
  type?: string;
  parentId?: string | number;
}

/**
 * A Research Project ID (RPID) as returned by the Data Management Planning
 * (DMP) API.
 */
export interface Rpid {
  encodedId?: string;
  status?: string;
  title: string;
  organisation?: RpidOrganisation | Record<string, RpidOrganisation>;
  lead?: RpidResearcher;
  supervisor?: RpidResearcher;
}
