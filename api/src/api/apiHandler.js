const serverlessExpress = require("@vendia/serverless-express");
const api = require("./api");
const server = serverlessExpress.createServer(api);

exports.handler = (event, context) =>
  serverlessExpress.proxy(server, event, context);
