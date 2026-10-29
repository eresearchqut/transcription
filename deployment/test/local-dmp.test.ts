import { LOCAL_DMP_CLIENT, readLocalDmp } from "../lib/local-dmp";

const realDmp = {
  DMP_API_URL: "https://dmp-api.example.com",
  DMP_TOKEN_URL: "https://dmp-auth.example.com/oauth2/token",
  DMP_CLIENT_ID: "client-id",
  DMP_CLIENT_SECRET: "client-secret",
};

describe("readLocalDmp", () => {
  it("keeps the local stand-in when no dmp is configured", () => {
    expect(readLocalDmp({})).toEqual({
      parameters: {},
      credentials: LOCAL_DMP_CLIENT,
    });
  });

  it("points the deploy at a real dmp", () => {
    expect(
      readLocalDmp({ ...realDmp, DMP_WEB_URL: "https://dmp.example.com" }),
    ).toEqual({
      parameters: {
        DmpApiUrl: realDmp.DMP_API_URL,
        DmpTokenUrl: realDmp.DMP_TOKEN_URL,
        DmpWebUrl: "https://dmp.example.com",
      },
      credentials: { clientId: "client-id", clientSecret: "client-secret" },
    });
  });

  it("refuses a partly configured dmp", () => {
    const { DMP_CLIENT_SECRET, DMP_TOKEN_URL, ...partial } = realDmp;
    expect(() => readLocalDmp(partial)).toThrow(
      "Missing DMP_TOKEN_URL, DMP_CLIENT_SECRET.",
    );
  });
});
