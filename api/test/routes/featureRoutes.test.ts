process.env.AWS_XRAY_SDK_ENABLED = "false";
process.env.AWS_XRAY_CONTEXT_MISSING = "IGNORE_ERROR";

import { FEATURES_OFF } from "model";
import request from "supertest";

import api from "../../src/api/api";
import { getFeatureFlags } from "../../src/client/featureFlagsClient";

jest.mock("../../src/client/featureFlagsClient", () => ({
  getFeatureFlags: jest.fn(),
}));

const mockGetFeatureFlags = getFeatureFlags as jest.MockedFunction<
  typeof getFeatureFlags
>;

describe("GET /features", () => {
  it("returns the feature flags without a token", async () => {
    mockGetFeatureFlags.mockResolvedValue({ ...FEATURES_OFF, rpid: true });

    const response = await request(api).get("/features");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...FEATURES_OFF, rpid: true });
  });
});
