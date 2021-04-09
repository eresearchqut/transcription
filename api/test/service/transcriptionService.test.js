const {jobStarted, getTranscriptions} = require('../../src/service/transcriptionService');

describe('transcription service test', function () {

    it("job started event is returned as resource", async () => {
        await jobStarted('76c65a59-1c57-489b-be96-020ceaa9675a', '95edf479-b991-4d0c-9e9e-d34474880b65',
            {
                s3SchemaVersion: '1.0',
                configurationId: 'eebad215-feed-40d2-8b97-7c9717881172',
                bucket: {
                    name: 'transcription-ap-southeast-2-854640616043',
                    ownerIdentity: [Object],
                    arn: 'arn:aws:s3:::transcription-ap-southeast-2-854640616043'
                },
                object: {
                    key: 'private/ap-southeast-2%3Ac4ef3d04-e56c-4544-bba5-0a73206c7fad/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/Welcome.wav',
                    size: 1292288,
                    eTag: 'c2ee56cbea8c6d3d694042bd4f5439fe',
                    sequencer: '00606FAC27C252D5E2'
                }
            },
            {
                '$metadata': {
                    httpStatusCode: 200,
                    requestId: '84eab607-c3e0-4d04-90f5-41acb59f7587',
                    extendedRequestId: undefined,
                    cfId: undefined,
                    attempts: 1,
                    totalRetryDelay: 0
                },
                TranscriptionJob: {
                    CompletionTime: undefined,
                    ContentRedaction: undefined,
                    CreationTime: "2021-04-09T01:21:45.830Z",
                    FailureReason: undefined,
                    IdentifiedLanguageScore: undefined,
                    IdentifyLanguage: undefined,
                    JobExecutionSettings: undefined,
                    LanguageCode: 'en-AU',
                    LanguageOptions: undefined,
                    Media: [Object],
                    MediaFormat: undefined,
                    MediaSampleRateHertz: undefined,
                    ModelSettings: undefined,
                    Settings: undefined,
                    StartTime: "2021-04-09T01:21:45.860Z",
                    Transcript: undefined,
                    TranscriptionJobName: '76c65a59-1c57-489b-be96-020ceaa9675a|95edf479-b991-4d0c-9e9e-d34474880b65',
                    TranscriptionJobStatus: 'IN_PROGRESS'
                }
            }
        );
        expect(await getTranscriptions('76c65a59-1c57-489b-be96-020ceaa9675a'))
            .toEqual([
                {
                    "transcriptionResponse": {
                        "$metadata": {
                            "attempts": 1,
                            "httpStatusCode": 200,
                            "requestId": "84eab607-c3e0-4d04-90f5-41acb59f7587",
                            "totalRetryDelay": 0
                        },
                        "TranscriptionJob": {
                            "CreationTime": "2021-04-09T01:21:45.830Z",
                            "LanguageCode": "en-AU",
                            "Media": [
                                null
                            ],
                            "StartTime": "2021-04-09T01:21:45.860Z",
                            "TranscriptionJobName": "76c65a59-1c57-489b-be96-020ceaa9675a|95edf479-b991-4d0c-9e9e-d34474880b65",
                            "TranscriptionJobStatus": "IN_PROGRESS"
                        }
                    },
                    "uploadEvent": {
                        "bucket": {
                            "arn": "arn:aws:s3:::transcription-ap-southeast-2-854640616043",
                            "name": "transcription-ap-southeast-2-854640616043",
                            "ownerIdentity": [
                                null
                            ]
                        },
                        "configurationId": "eebad215-feed-40d2-8b97-7c9717881172",
                        "object": {
                            "eTag": "c2ee56cbea8c6d3d694042bd4f5439fe",
                            "key": "private/ap-southeast-2%3Ac4ef3d04-e56c-4544-bba5-0a73206c7fad/76c65a59-1c57-489b-be96-020ceaa9675a/en-AU/Welcome.wav",
                            "sequencer": "00606FAC27C252D5E2",
                            "size": 1292288
                        },
                        "s3SchemaVersion": "1.0"
                    }
                }
            ]);


    });

});
