import express from "express";

import { listRpids } from "../client/dmpClient";
import { getFeatureFlags } from "../client/featureFlagsClient";
import { getIdentityId } from "../util/requestUtils";

const router = express.Router();

router.get("/", (request, response, next) => {
  const identityId = getIdentityId(request);
  getFeatureFlags()
    .then(async ({ rpid }) => {
      if (!rpid) {
        response.sendStatus(404);
        return;
      }
      response.json(await listRpids(identityId));
    })
    .catch(next);
});

export default router;
