import serverlessExpress from "@vendia/serverless-express";

import api from "./api";

export const handler = serverlessExpress({ app: api });
