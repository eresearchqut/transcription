/**
 * Stands in for the Data Management Planning tool's RPID API, which the
 * handlers check each upload's RPID against. It answers the token request with
 * any client credentials, and serves the v1 user routes from dmp-rpids.json
 * the way the DMP does: an unknown user, or an RPID that is not one of the
 * user's plans with the requested status, is a 404.
 *
 * researcher1001 has two active plans and an archived one. researcher2002 has
 * none, which shows the frontend's warning for a user with no projects.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8080);
const plans = JSON.parse(
  readFileSync(new URL("./dmp-rpids.json", import.meta.url), "utf8"),
);

const send = (response, statusCode, body) => {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const notFound = (response, message) =>
  send(response, 404, { statusCode: 404, message, error: "Not Found" });

createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/_healthz") {
    return send(response, 200, {});
  }

  if (request.method === "POST" && url.pathname === "/oauth2/token") {
    return send(response, 200, {
      access_token: "local",
      token_type: "Bearer",
      expires_in: 3600,
    });
  }

  const match = url.pathname.match(/^\/v1\/rpid\/user\/([^/]+)(?:\/([^/]+))?$/);
  if (request.method !== "GET" || !match) {
    return notFound(response, `Cannot ${request.method} ${url.pathname}`);
  }
  if (!request.headers.authorization?.startsWith("Bearer ")) {
    return send(response, 401, { statusCode: 401, message: "Unauthorized" });
  }

  const [userId, rpid] = match
    .slice(1)
    .map((part) => part && decodeURIComponent(part));
  const userPlans = plans[userId];
  if (!userPlans) {
    return notFound(response, "No researcher found");
  }
  const status = url.searchParams.get("status");
  const matching = userPlans.filter(
    (plan) => !status || plan.status === status,
  );
  if (!rpid) {
    return send(response, 200, matching);
  }
  const plan = matching.find((candidate) => candidate.rpid === rpid);
  return plan
    ? send(response, 200, plan)
    : notFound(response, "No plan found for researcher");
}).listen(port, () => console.log(`DMP stub listening on ${port}`));
