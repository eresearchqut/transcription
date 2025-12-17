import serverlessExpress from "@codegenie/serverless-express";

import api from "./api";

export const handler = serverlessExpress({ app: api });
