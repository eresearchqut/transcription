import express from "express";

import { listRpids } from "../client/dmpClient";
import { getIdentityId } from "../util/requestUtils";

const router = express.Router();

router.get("/", (request, response, next) => {
  const identityId = getIdentityId(request);
  listRpids(identityId)
    .then((rpids) => response.json(rpids))
    .catch(next);
});

export default router;
