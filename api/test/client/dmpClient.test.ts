import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import { mockClient } from "aws-sdk-client-mock";

import {
  clearTokenCache,
  getRpid,
  listRpids,
} from "../../src/client/dmpClient";

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: `${status}`,
    json: async () => body,
  }) as Response;

describe("dmpClient", () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const ssmMock = mockClient(SSMClient);

  beforeAll(() => {
    process.env.DMP_TOKEN_URL = "https://dmp.example.com/oauth2/token";
    process.env.DMP_API_URL = "https://dmp.example.com/api/";
    process.env.DMP_CLIENT_ID = "client-id";
    process.env.DMP_CLIENT_SECRET = "client-secret";
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    ssmMock.reset();
    delete process.env.DMP_CREDENTIALS_PARAMETER;
    clearTokenCache();
  });

  it("requests a client_credentials token with basic auth and reuses it", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValue(jsonResponse(200, []));

    await listRpids("user-1");
    await getRpid("user-1", "RPID-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://dmp.example.com/oauth2/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://dmp.example.com/api/rpid/user-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://dmp.example.com/api/rpid/user-1/RPID-1",
      expect.anything(),
    );
  });

  it("refreshes the token once it has expired", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 30 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-2", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, []));

    await listRpids("user-1");
    await listRpids("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://dmp.example.com/api/rpid/user-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-2",
        }),
      }),
    );
  });

  it("resolves the credentials from Parameter Store when a parameter name is set", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER =
      "/app/dev/transcription/dmp-credentials";
    ssmMock
      .on(GetParameterCommand, {
        Name: process.env.DMP_CREDENTIALS_PARAMETER,
        WithDecryption: true,
      })
      .resolves({
        Parameter: {
          Value: JSON.stringify({
            clientId: "client-id-from-parameter-store",
            clientSecret: "secret-from-parameter-store",
          }),
        },
      });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValue(jsonResponse(200, []));

    await listRpids("user-1");
    await listRpids("user-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://dmp.example.com/oauth2/token",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from(
            "client-id-from-parameter-store:secret-from-parameter-store",
          ).toString("base64")}`,
        }),
      }),
    );
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
  });

  it("rejects when the Parameter Store credentials are empty", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER =
      "/app/dev/transcription/dmp-credentials";
    ssmMock.on(GetParameterCommand).resolves({});
    await expect(listRpids("user-1")).rejects.toThrow(
      "DMP credentials /app/dev/transcription/dmp-credentials are empty",
    );
  });

  it("rejects when the Parameter Store credentials are incomplete", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER =
      "/app/dev/transcription/dmp-credentials";
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: { Value: JSON.stringify({ clientId: "client-id" }) },
    });
    await expect(listRpids("user-1")).rejects.toThrow(
      "DMP credentials /app/dev/transcription/dmp-credentials must contain clientId and clientSecret",
    );
  });

  it("rejects when the token request fails and re-reads the credentials on the next attempt", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER =
      "/app/dev/transcription/dmp-credentials";
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: {
        Value: JSON.stringify({
          clientId: "client-id",
          clientSecret: "client-secret",
        }),
      },
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, []));

    await expect(listRpids("user-1")).rejects.toThrow(
      "Failed to retrieve DMP access token",
    );
    await expect(listRpids("user-1")).resolves.toEqual([]);

    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
  });

  it("rejects when the DMP API request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(500, {}));
    await expect(listRpids("user-1")).rejects.toThrow(
      "DMP API request failed: GET /rpid/user-1 500",
    );
  });

  it("retries once with a fresh token when the DMP API rejects the cached token", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-2", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(200, [{ title: "Project" }]));

    await expect(listRpids("user-1")).resolves.toEqual([{ title: "Project" }]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://dmp.example.com/oauth2/token",
      expect.anything(),
    );
  });

  it("does not retry more than once on repeated authorization failures", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-1", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(403, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: "token-2", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(jsonResponse(403, {}));

    await expect(listRpids("user-1")).rejects.toThrow(
      "DMP API request failed: GET /rpid/user-1 403",
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
