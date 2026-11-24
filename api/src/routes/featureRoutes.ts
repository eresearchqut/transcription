import express from "express";

import { getFeatureFlags } from "../client/featureFlagsClient";

const router = express.Router();

/**
 * The only route that needs no token, because the landing page reads the
 * flags before anyone signs in. API Gateway sends /features around the Cognito
 * authorizer.
 */
router.get("/", (_request, response, next) => {
  getFeatureFlags()
    .then((flags) => response.set("Cache-Control", "no-cache").json(flags))
    .catch(next);
});

export default router;
