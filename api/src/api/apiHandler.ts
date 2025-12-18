import serverlessExpress from "@codegenie/serverless-express";

import api from "./api";

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    cachedHandler = serverlessExpress({
      app: api,
    });
  }
  return cachedHandler(event, context);
};
