import express from "express";
import type { Rpid } from "model";

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
      const rpids: Rpid[] = (await listRpids(identityId)).map(
        ({ rpid, title }) => ({ rpid, title }),
      );
      response.json(rpids);
    })
    .catch(next);
});

export default router;
