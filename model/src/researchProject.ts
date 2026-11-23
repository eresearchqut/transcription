import type {
  FieldOfResearchDto,
  OrganisationDto,
  ResearcherDto,
} from "@eresearchqut/dmp-api";

type Researcher = Pick<ResearcherDto, "id" | "name">;
type Organisation = Pick<OrganisationDto, "id" | "name">;
type FieldOfResearch = Pick<FieldOfResearchDto, "code" | "name" | "year">;

/**
 * The details of an RPID's project kept with a job and its usage record. They
 * are the ones the landing page's "Usage information" lists.
 */
export interface ResearchProject {
  rpid: string;
  title: string;
  lead: Researcher;
  supervisor?: Researcher;
  faculty?: Organisation;
  school?: Organisation;
  fieldsOfResearch?: FieldOfResearch[];
  isHdrProject?: boolean;
}

const researcher = ({ id, name }: Researcher): Researcher => ({ id, name });

const organisation = ({ id, name }: Organisation): Organisation => ({
  id,
  name,
});

/**
 * Copies each field by name, so a field the DMP adds to its response is not
 * kept until it is added here and to the landing page.
 */
export const toResearchProject = ({
  rpid,
  title,
  lead,
  supervisor,
  faculty,
  school,
  fieldsOfResearch,
  isHdrProject,
}: ResearchProject): ResearchProject => ({
  rpid,
  title,
  lead: researcher(lead),
  ...(supervisor ? { supervisor: researcher(supervisor) } : {}),
  ...(faculty ? { faculty: organisation(faculty) } : {}),
  ...(school ? { school: organisation(school) } : {}),
  ...(fieldsOfResearch
    ? {
        fieldsOfResearch: fieldsOfResearch.map(({ code, name, year }) => ({
          code,
          name,
          year,
        })),
      }
    : {}),
  ...(isHdrProject === undefined ? {} : { isHdrProject }),
});
