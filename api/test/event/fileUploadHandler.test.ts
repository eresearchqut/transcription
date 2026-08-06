import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import type { RpidDto } from "@eresearchqut/dmp-api";
import { mockClient } from "aws-sdk-client-mock";

import { getRpid } from "../../src/client/dmpClient";
import { handler } from "../../src/event/fileUploadHandler";
import { getResource } from "../../src/repository/repository";
import fileMetadata from "./fileMetadata.json";
import fileUploadEvent from "./fileUploadEvent.json";

const IDENTITY_ID = "76c65a59-1c57-489b-be96-020ceaa9675a";
const JOB_ID = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const RPID = "RPID-1234";

const project: RpidDto = {
  encodedId: RPID,
  title: "My Research Project",
  lead: { id: "1", name: "Jane Citizen" },
  organisation: {
    faculty: { id: 1, name: "Faculty of Science", type: "faculty" },
  },
};

jest.mock("../../src/client/dmpClient", () => ({
  getRpid: jest.fn(),
}));

const mockGetRpid = getRpid as jest.MockedFunction<typeof getRpid>;

describe("fileUploadHandler", () => {
  const transcribeMock = mockClient(TranscribeClient);
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    transcribeMock.reset();
    s3Mock.reset();
    mockGetRpid.mockReset();
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
});
