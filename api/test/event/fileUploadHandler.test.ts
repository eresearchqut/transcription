import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";

import { mockClient } from "aws-sdk-client-mock";

import { clearTokenCache } from "../../src/client/dmpClient";
import { handler } from "../../src/event/fileUploadHandler";
import { getResource } from "../../src/repository/repository";
import fileMetadata from "./fileMetadata.json";
import fileUploadEvent from "./fileUploadEvent.json";

const IDENTITY_ID = "76c65a59-1c57-489b-be96-020ceaa9675a";
const JOB_ID = "2e9b38b5-1df0-4841-8308-f174fb88aac7";
const RPID = "RPID-1234";

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: `${status}`,
    json: async () => body,
  }) as Response;

const tokenResponse = jsonResponse(200, {
  access_token: "test-token",
  expires_in: 3600,
});

describe("fileUploadHandler", () => {
  const transcribeMock = mockClient(TranscribeClient);
  const s3Mock = mockClient(S3Client);
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeAll(() => {
    process.env.DMP_TOKEN_URL = "https://dmp.example.com/oauth2/token";
    process.env.DMP_API_URL = "https://dmp.example.com/api";
    process.env.DMP_CLIENT_ID = "client-id";
    process.env.DMP_CLIENT_SECRET = "client-secret";
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  beforeEach(() => {
    transcribeMock.reset();
    s3Mock.reset();
    fetchMock.mockReset();
    clearTokenCache();
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
    fetchMock
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(jsonResponse(200, { encodedId: RPID }));

    expect(await handler(fileUploadEvent)).toEqual("Processed 1 uploads");

    expect(fetchMock).toHaveBeenCalledWith(
      `https://dmp.example.com/api/rpid/${IDENTITY_ID}/${RPID}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(1);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({ rpid: RPID }),
      }),
    );
  });

  it("rejects the job when the rpid metadata is missing", async () => {
    s3Mock.on(HeadObjectCommand).resolves(fileMetadata);

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(fetchMock).not.toHaveBeenCalled();
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

  it("rejects the job when the rpid cannot be validated", async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    fetchMock
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(jsonResponse(404, { message: "Not found" }));

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason: `The Research Project ID (RPID) ${RPID} could not be validated.`,
          },
        },
      }),
    );
  });

  it("rejects the job when the DMP API is unavailable", async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      Metadata: { ...fileMetadata.Metadata, rpid: RPID },
    });
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    expect(await handler(fileUploadEvent)).toEqual("Processed 0 uploads");

    expect(
      transcribeMock.commandCalls(StartTranscriptionJobCommand),
    ).toHaveLength(0);
    expect(await getResource(IDENTITY_ID, JOB_ID)).toEqual(
      expect.objectContaining({
        jobStatusUpdated: {
          detail: {
            TranscriptionJobStatus: "FAILED",
            FailureReason: `The Research Project ID (RPID) ${RPID} could not be validated.`,
          },
        },
      }),
    );
  });
});
