import { Request } from "express";

interface Claims {
  username?: string;
  "custom:username"?: string;
  identities?: { userId?: string }[];
  "cognito:username"?: string;
  "custom:qutIdentityId"?: string;
  "custom:eResearchGroups"?: string;
}

export const getClaims = (request: Request): Claims => {
  const token = request.header("Authorization");
  if (token) {
    try {
      const base64decoded = Buffer.from(token.split(".")[1], "base64").toString(
        "ascii"
      );
      return JSON.parse(base64decoded);
    } catch (e) {
      console.error("Invalid JWT token. Cannot resolve claims.", e);
      throw e;
    }
  } else {
    throw new Error(
      `No token found in Authorization header. Cannot resolve claims.`
    );
  }
};

export const getUserName = (request: Request) => {
  let username = "anonymous";
  const claims = getClaims(request);
  if (claims["username"]) {
    username = claims.username;
  } else if (claims["custom:username"]) {
    username = claims["custom:username"];
  } else if (
    claims["identities"] &&
    claims["identities"][0] &&
    claims["identities"][0]["userId"]
  ) {
    username = claims["identities"][0]["userId"];
  } else if (claims["cognito:username"]) {
    username = claims["cognito:username"];
  } else {
    console.warn(`No username claim found in claims.`);
  }
  return username;
};
export const getIdentityId = (request: Request) => {
  const identityId = getClaims(request)["custom:qutIdentityId"];
  if (identityId === undefined) {
    throw new Error("Missing identity id");
  }
  return identityId;
};

export const getRoles = (request: Request) => {
  const groups = getClaims(request)["custom:eResearchGroups"];
  if (groups === undefined) {
    return [];
  }
  return Array.from(groups.matchAll(/([\w-]+)/g), (match) => match[1])
    .filter((group) => group.startsWith("transcription-"))
    .map((group) => group.substring(4));
};
