import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import type { RpidDto } from "@eresearchqut/dmp-api";
import { mockClient } from "aws-sdk-client-mock";
import { FEATURES_OFF } from "model";

import { getRpid } from "../../src/client/dmpClient";
import { getFeatureFlags } from "../../src/client/featureFlagsClient";
import { handler } from "../../src/event/fileUploadHandler";
import { getResource, putResource } from "../../src/repository/repository";
import fileMetadata from "./fileMetadata.json";
import fileUploadEvent from "./fileUploadEvent.json";

const IDENTITY_ID = "76c65a59-1c57-489b-be96-020ceaa9675a";
const JOB_ID = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const RPID = "RPID-1234";

const project: RpidDto = {
  rpid: RPID,
  title: "My Research Project",
  createdDate: "2026-03-02T00:00:00.000Z",
  lead: { id: "1", name: "Jane Citizen" },
  faculty: { id: 1, name: "Faculty of Science", type: "faculty" },
};

jest.mock("../../src/client/dmpClient", () => ({
  getRpid: jest.fn(),
}));

jest.mock("../../src/client/featureFlagsClient", () => ({
  getFeatureFlags: jest.fn(),
}));

const mockGetRpid = getRpid as jest.MockedFunction<typeof getRpid>;
const mockGetFeatureFlags = getFeatureFlags as jest.MockedFunction<
  typeof getFeatureFlags
>;

describe("fileUploadHandler", () => {
  const transcribeMock = mockClient(TranscribeClient);
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    transcribeMock.reset();
    s3Mock.reset();
    mockGetRpid.mockReset();
    mockGetFeatureFlags.mockResolvedValue({ ...FEATURES_OFF, rpid: true });
    transcribeMock.on(StartTranscriptionJobCommand).resolves({
      TranscriptionJob: {
        TranscriptionJobName: "A-Job",
      },
    });
  });

  it("starts a transcription job when the rpid is valid", async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    mockGetRpid.mockResolvedValue(project);

    expect(await handler(fileUploadEvent)).toEqual("Processed 1 uploads");

    expect(mockGetRpid).toHaveBeenCalledWith(IDENTITY_ID, RPID);
    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(1);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({ rpid: RPID }),
        rpidPayload: project,
      }),
    );
  });

  it("rejects the job when the rpid metadata is missing", async () => {
    s3Mock.on(HeadObjectCommand).resolves(fileMetadata);

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(mockGetRpid).not.toHaveBeenCalled();
    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason:
              "A Research Project ID (RPID) is required to start a transcription.",
          },
        },
      }),
    );
  });

  it("rejects the job when the rpid is not one of the user's active projects", async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    mockGetRpid.mockResolvedValue(undefined);

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason: `The Research Project ID (RPID) ${RPID} is not one of your active projects in the Data Management Planning tool.`,
          },
        },
      }),
    );
  });

  it("rejects the job when the DMP API is unavailable", async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    mockGetRpid.mockRejectedValue(new Error("connect ECONNREFUSED"));

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason: `The Research Project ID (RPID) ${RPID} could not be checked with the Data Management Planning tool. Please try again later.`,
          },
        },
      }),
    );
  });

  it("starts a transcription job without an rpid when the rpid flag is off", async () => {
    mockGetFeatureFlags.mockResolvedValue({ ...FEATURES_OFF, rpid: false });
    s3Mock.on(HeadObjectCommand).resolves(fileMetadata);

    expect(await handler(fileUploadEvent)).toEqual("Processed 1 uploads");

    expect(mockGetRpid).not.toHaveBeenCalled();
    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(1);
  });

  it("fails the invocation when the feature flags can't be read", async () => {
    mockGetFeatureFlags.mockRejectedValue(new Error("ThrottlingException"));

    await expect(handler(fileUploadEvent)).rejects.toThrow(
      "ThrottlingException",
    );

    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
  });

  it("leaves a finished job alone when a repeated upload event is rejected", async () => {
    const finished = {
      downloadKey: `users/${IDENTITY_ID}/${JOB_ID}.json`,
      jobStatusUpdated: { detail: { TranscriptionJobStatus: "COMPLETED" } },
    };
    await putResource(IDENTITY_ID, JOB_ID, finished);
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    mockGetRpid.mockRejectedValue(new Error("connect ECONNREFUSED"));

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining(finished),
    );
  });
});
