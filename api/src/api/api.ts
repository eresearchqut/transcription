import xray from "aws-xray-sdk";
import bodyParser from "body-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";

import rpidRoutes from "../routes/rpidRoutes";
import transcriptionRoutes from "../routes/transcriptionRoutes";
import userRoutes from "../routes/userRoutes";

const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error.stack);
  response
    .status(500)
    .send("Internal Server Error, please check the log for further details.");
};

const api = express().use(
  bodyParser.json(),
  cors(),
  xray.express.openSegment("transcription"),
);

api.use("/transcription", transcriptionRoutes);
api.use("/user", userRoutes);
api.use("/rpid", rpidRoutes);
api.use(errorHandler);
api.use(xray.express.closeSegment());

export default api;
