import express from "express";

import { getTranscriptions } from "../service/transcriptionService";
import { getIdentityId } from "../util/requestUtils";

const router = express.Router();

router.get("/", (request, response) => {
  const identityId = getIdentityId(request);
  getTranscriptions(identityId).then((transcriptions) =>
    response.json(transcriptions),
  );
});

export default router;
