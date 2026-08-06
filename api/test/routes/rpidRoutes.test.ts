process.env.AWS_XRAY_SDK_ENABLED = "false";
process.env.AWS_XRAY_CONTEXT_MISSING = "IGNORE_ERROR";

import request from "supertest";

import api from "../../src/api/api";
import { listRpids } from "../../src/client/dmpClient";

jest.mock("../../src/client/dmpClient", () => ({
  listRpids: jest.fn(),
}));

const mockListRpids = listRpids as jest.MockedFunction<typeof listRpids>;

const authorizationHeader = (claims: Record<string, unknown>): string => {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64");
  return `Bearer header.${payload}.signature`;
};

const IDENTITY_ID = "test-user";
const AUTHORIZATION = authorizationHeader({
  "custom:qutIdentityId": IDENTITY_ID,
});

describe("GET /rpid", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns the user's rpids", async () => {
    const rpids = [
      { encodedId: "RPID-1", title: "First project", status: "ACTIVE" },
      { encodedId: "RPID-2", title: "Second project", status: "CLOSED" },
    ];
    mockListRpids.mockResolvedValue(rpids);

    const response = await request(api)
      .get("/rpid")
      .set("Authorization", AUTHORIZATION);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rpids);
    expect(mockListRpids).toHaveBeenCalledWith(IDENTITY_ID);
  });

  it("returns an empty list when the user has no rpids", async () => {
    mockListRpids.mockResolvedValue([]);

    const response = await request(api)
      .get("/rpid")
      .set("Authorization", AUTHORIZATION);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 500 when the DMP API request fails", async () => {
    mockListRpids.mockRejectedValue(new Error("DMP API request failed: 502"));

    const response = await request(api)
      .get("/rpid")
      .set("Authorization", AUTHORIZATION);

    expect(response.status).toBe(500);
    expect(response.text).toContain("Internal Server Error");
  });

  it("returns 500 when no authorization header is provided", async () => {
    const response = await request(api).get("/rpid");

    expect(response.status).toBe(500);
    expect(mockListRpids).not.toHaveBeenCalled();
  });

  it("returns 500 when the token has no identity id claim", async () => {
    const response = await request(api)
      .get("/rpid")
      .set("Authorization", authorizationHeader({ username: "someone" }));

    expect(response.status).toBe(500);
    expect(mockListRpids).not.toHaveBeenCalled();
  });
});
