import {
  getTranscriptions,
  jobStarted,
} from "../../src/service/transcriptionService";

describe("transcription service test", () =>
  it("job started event is returned as resource", async () => {
    await jobStarted(
      "76c65a59-1c57-489b-be96-020ceaa9675a",
      "95edf479-b991-4d0c-9e9e-d34474880b65",
      "transcription/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/a907ed50-a407-461e-bc20-b1ccdc8f41a1.json",
      {
        s3SchemaVersion: "1.0",
        configurationId: "eebad215-feed-40d2-8b97-7c9717881172",
        bucket: {
          name: "transcription-ap-southeast-2-854640616043",
          ownerIdentity: [Object],
          arn: "arn:aws:s3:::transcription-ap-southeast-2-854640616043",
        },
        object: {
          key: "private/ap-southeast-2%3Ac4ef3d04-e56c-4544-bba5-0a73206c7fad/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/Welcome.wav",
          size: 1292288,
          eTag: "c2ee56cbea8c6d3d694042bd4f5439fe",
          sequencer: "00606FAC27C252D5E2",
        },
      },
      {
        TranscriptionJob: {
          CompletionTime: undefined,
          ContentRedaction: undefined,
          CreationTime: new Date("2021-04-09T01:21:45.830Z"),
          FailureReason: undefined,
          IdentifiedLanguageScore: undefined,
          IdentifyLanguage: undefined,
          JobExecutionSettings: undefined,
          LanguageCode: "en-AU",
          LanguageOptions: undefined,
          MediaFormat: undefined,
          MediaSampleRateHertz: undefined,
          ModelSettings: undefined,
          Settings: undefined,
          StartTime: new Date("2021-04-09T01:21:45.860Z"),
          Transcript: undefined,
          TranscriptionJobName:
            "76c65a59-1c57-489b-be96-020ceaa9675a|95edf479-b991-4d0c-9e9e-d34474880b65",
          TranscriptionJobStatus: "IN_PROGRESS",
        },
      },
      {
        languagecode: "en-AU",
        filename: "Welcome.wav",
        filetype: "userUploadedFile",
      }
    );
    expect(
      await getTranscriptions("76c65a59-1c57-489b-be96-020ceaa9675a")
    ).toEqual([
      expect.objectContaining({
        outputKey:
          "transcription/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/a907ed50-a407-461e-bc20-b1ccdc8f41a1.json",
        pk: "76c65a59-1c57-489b-be96-020ceaa9675a",
        sk: "95edf479-b991-4d0c-9e9e-d34474880b65",
        transcriptionResponse: {
          TranscriptionJob: {
            CreationTime: "2021-04-09T01:21:45.830Z",
            LanguageCode: "en-AU",
            StartTime: "2021-04-09T01:21:45.860Z",
            TranscriptionJobName:
              "76c65a59-1c57-489b-be96-020ceaa9675a|95edf479-b991-4d0c-9e9e-d34474880b65",
            TranscriptionJobStatus: "IN_PROGRESS",
          },
        },
        uploadEvent: {
          bucket: {
            arn: "arn:aws:s3:::transcription-ap-southeast-2-854640616043",
            name: "transcription-ap-southeast-2-854640616043",
            ownerIdentity: [null],
          },
          configurationId: "eebad215-feed-40d2-8b97-7c9717881172",
          object: {
            eTag: "c2ee56cbea8c6d3d694042bd4f5439fe",
            key: "private/ap-southeast-2%3Ac4ef3d04-e56c-4544-bba5-0a73206c7fad/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/Welcome.wav",
            sequencer: "00606FAC27C252D5E2",
            size: 1292288,
          },
          s3SchemaVersion: "1.0",
        },
      }),
    ]);
  }));
