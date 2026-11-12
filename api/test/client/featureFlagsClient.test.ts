import {
  GetParameterCommand,
  ParameterNotFound,
  SSMClient,
} from "@aws-sdk/client-ssm";

import { mockClient } from "aws-sdk-client-mock";
import { FEATURES_OFF } from "model";

import {
  getFeatureFlags,
  resetFeatureFlags,
} from "../../src/client/featureFlagsClient";

const PARAMETER_NAME = "/app/dev/transcription/features";

describe("getFeatureFlags", () => {
  const ssmMock = mockClient(SSMClient);

  beforeEach(() => {
    ssmMock.reset();
    resetFeatureFlags();
    process.env.FEATURE_FLAGS_PARAMETER = PARAMETER_NAME;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    delete process.env.FEATURE_FLAGS_PARAMETER;
  });

  const parameter = (value: unknown) => ({
    Parameter: { Value: JSON.stringify(value) },
  });

  it("reads the flags from the parameter", async () => {
    ssmMock.on(GetParameterCommand).resolves(parameter({ rpid: true }));

    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: true });
    expect(ssmMock.commandCalls(GetParameterCommand)[0].args[0].input).toEqual({
      Name: PARAMETER_NAME,
    });
  });

  it("turns off a flag that isn't true", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    ssmMock.on(GetParameterCommand).resolves(parameter({ rpid: "true" }));

    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: false });
  });

  it("turns everything off when the parameter doesn't exist", async () => {
    ssmMock
      .on(GetParameterCommand)
      .rejects(new ParameterNotFound({ message: "", $metadata: {} }));

    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: false });
  });

  it("reads the parameter again once the flags are a minute old", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(0);
    ssmMock
      .on(GetParameterCommand)
      .resolvesOnce(parameter({ rpid: false }))
      .resolves(parameter({ rpid: true }));

    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: false });
    now.mockReturnValue(59_999);
    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: false });
    now.mockReturnValue(60_000);
    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: true });
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
  });

  it("keeps the last flags read when a later read fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const now = jest.spyOn(Date, "now").mockReturnValue(0);
    ssmMock
      .on(GetParameterCommand)
      .resolvesOnce(parameter({ rpid: true }))
      .rejects(new Error("ThrottlingException"));

    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: true });
    now.mockReturnValue(60_000);
    expect(await getFeatureFlags()).toEqual({ ...FEATURES_OFF, rpid: true });
  });

  it("rejects when the first read fails", async () => {
    ssmMock.on(GetParameterCommand).rejects(new Error("ThrottlingException"));

    await expect(getFeatureFlags()).rejects.toThrow("ThrottlingException");
  });
});
