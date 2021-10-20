const express = require("express");
const xray = require("aws-xray-sdk");
const cors = require("cors");
const bodyParser = require("body-parser");
const api = express().use(
  bodyParser.json(),
  cors(),
  xray.express.openSegment("Transcription")
);

api.use("/transcription", require("../routes/transcriptionRoutes"));
api.use("/user", require("../routes/userRoutes"));
api.use((error, request, response, next) => {
  console.error(error.stack);
  response
    .status(500)
    .send("Internal Server Error, please check the log for further details.");
});

api.use(xray.express.closeSegment());

module.exports = api;
