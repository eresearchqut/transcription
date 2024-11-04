import express from "express";

import {
  getTranscription,
  getTranscriptions,
} from "../service/transcriptionService";
import { getIdentityId } from "../util/requestUtils";

const router = express.Router();

router.get("/", (request, response) => {
  const identityId = getIdentityId(request);
  getTranscriptions(identityId).then((transcriptions) =>
    response.json(transcriptions),
  );
});

router.get("/:jobId", (request, response) => {
  const identityId = getIdentityId(request);
  const jobId = request.params.jobId;
  getTranscription(identityId, jobId).then((transcription) =>
    response.json(transcription),
  );
});

export default router;
