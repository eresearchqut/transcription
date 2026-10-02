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

const tokenResponse = (accessToken = "token-1", expiresIn = 3600) =>
  jsonResponse(200, { access_token: accessToken, expires_in: expiresIn });

const PARAMETER_NAME = "/app/dev/transcription/dmp-credentials";

/** The SDK 1.1 shape the DMP serves today. */
const encodedIdDto = {
  encodedId: "RPID-1",
  title: "First project",
  status: "ACTIVE",
  lead: { id: "1", name: "Jane Citizen", preferredName: "Jane" },
  supervisor: { id: "2", name: "John Smith" },
  organisation: {
    faculty: { id: 1, name: "Faculty of Science", type: "faculty" },
    school: { id: 2, name: "School of Physics", type: "school", parentId: 1 },
  },
};

/** The shape the next DMP release serves. */
const rpidDto = {
  rpid: "RPID-2",
  title: "Second project",
  status: "ACTIVE",
  lead: { id: "1", name: "Jane Citizen" },
  faculty: { id: 1, name: "Faculty of Science", type: "faculty" },
  school: { id: 2, name: "School of Physics", type: "school" },
  fieldsOfResearch: [{ code: "5101", name: "Astronomical sciences" }],
};

describe("dmpClient", () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const ssmMock = mockClient(SSMClient);

  beforeAll(() => {
    process.env.DMP_TOKEN_URL = "https://auth.dmp.example.com/oauth2/token";
    process.env.DMP_API_URL = "https://api.dmp.example.com/";
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
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, encodedIdDto));

    await listRpids("user-1");
    await getRpid("user-1", "RPID-1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://auth.dmp.example.com/oauth2/token",
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
      "https://api.dmp.example.com/v1/rpid/user/user-1?status=ACTIVE",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.dmp.example.com/v1/rpid/user/user-1/RPID-1?status=ACTIVE",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-1" }),
      }),
    );
  });

  it("encodes the user and the RPID in the path", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse(200, encodedIdDto));

    await getRpid("user/1", "RPID 1");

    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.dmp.example.com/v1/rpid/user/user%2F1/RPID%201?status=ACTIVE",
      expect.anything(),
    );
  });

  it("maps both DMP shapes to the transcription model", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(200, [encodedIdDto, rpidDto, { title: "No RPID" }]),
      );

    await expect(listRpids("user-1")).resolves.toEqual([
      {
        rpid: "RPID-1",
        title: "First project",
        lead: "Jane Citizen",
        supervisor: "John Smith",
        faculty: "Faculty of Science",
        school: "School of Physics",
      },
      {
        rpid: "RPID-2",
        title: "Second project",
        lead: "Jane Citizen",
        supervisor: undefined,
        faculty: "Faculty of Science",
        school: "School of Physics",
      },
    ]);
  });

  it("lists no RPIDs when the DMP doesn't know the user", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(404, { message: "No researcher found" }),
      );

    await expect(listRpids("user-1")).resolves.toEqual([]);
  });

  it("resolves undefined when the RPID is not one of the user's active plans", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(404, { message: "No plan found for researcher" }),
      );

    await expect(getRpid("user-1", "RPID-1")).resolves.toBeUndefined();
  });

  it("refreshes the token once it has expired", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("token-1", 30))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(tokenResponse("token-2"))
      .mockResolvedValueOnce(jsonResponse(200, []));

    await listRpids("user-1");
    await listRpids("user-1");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-2" }),
      }),
    );
  });

  it("reads the credentials from Parameter Store once when a parameter is set", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER = PARAMETER_NAME;
    ssmMock
      .on(GetParameterCommand, { Name: PARAMETER_NAME, WithDecryption: true })
      .resolves({
        Parameter: {
          Value: JSON.stringify({
            clientId: "stored-id",
            clientSecret: "stored-secret",
          }),
        },
      });
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValue(jsonResponse(200, []));

    await listRpids("user-1");
    await listRpids("user-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("stored-id:stored-secret").toString("base64")}`,
        }),
      }),
    );
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
  });

  it("rejects when the Parameter Store credentials are empty", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER = PARAMETER_NAME;
    ssmMock.on(GetParameterCommand).resolves({});

    await expect(listRpids("user-1")).rejects.toThrow(
      `DMP credentials ${PARAMETER_NAME} are empty`,
    );
  });

  it("rejects when the Parameter Store credentials are incomplete", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER = PARAMETER_NAME;
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: { Value: JSON.stringify({ clientId: "client-id" }) },
    });

    await expect(listRpids("user-1")).rejects.toThrow(
      `DMP credentials ${PARAMETER_NAME} must contain clientId and clientSecret`,
    );
  });

  it("re-reads the credentials after a failed token request", async () => {
    process.env.DMP_CREDENTIALS_PARAMETER = PARAMETER_NAME;
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: {
        Value: JSON.stringify({
          clientId: "client-id",
          clientSecret: "client-secret",
        }),
      },
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse(200, []));

    await expect(listRpids("user-1")).rejects.toThrow(
      "DMP token request failed: 401",
    );
    await expect(listRpids("user-1")).resolves.toEqual([]);

    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
  });

  it.each([
    401, 403, 500,
  ])("rejects when the DMP answers %i", async (status) => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse(status, {}));

    await expect(getRpid("user-1", "RPID-1")).rejects.toThrow(
      `DMP request failed: GET /v1/rpid/user/user-1/RPID-1 ${status}`,
    );
  });
});
