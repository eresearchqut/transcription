const {
    TranscribeClient,
    StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");
const {
    jobStarted
} = require('../service/transcriptionService');
const {v4: uuid} = require('uuid');


const region = process.env.AWS_REGION || 'ap-southeast-2';
const transcribeBucket = process.env.BUCKET_NAME || 'transcriptions';
const transcribeClient = new TranscribeClient({region});

const uploadPattern = /private\/(.*)\/(.*)\/(.*)\/(.*)/gm
const fileExtensionPattern = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gmi

const mediaFormat = (fileExtension) => fileExtension;

exports.handler = async (event) => {

    console.log(JSON.stringify(event));

    for (const record of event['Records']) {
        const key = record['s3']['object']['key'];
        const bucketName = record['s3']['bucket']['name'];
        const [matchedKey, cognitoId, identityId, languageCode, fileName] = [...key.matchAll(uploadPattern)][0];
        console.log(matchedKey, cognitoId, identityId, languageCode, fileName);
        if (matchedKey) {
            const [matchedFileExtension, fileExtension] = [...fileName.matchAll(fileExtensionPattern)][0];
            const jobId = uuid();
            const outputKey = `public/transcription/${identityId}/${languageCode}/${jobId}.json`;
            if (matchedFileExtension) {
                const params = {
                    TranscriptionJobName: `${identityId}_${jobId}`,
                    LanguageCode: languageCode,
                    MediaFormat: mediaFormat(fileExtension),
                    Media: {
                        MediaFileUri: `https://s3-${region}.amazonaws.com/${bucketName}/${key}`,
                    },
                    OutputBucketName: transcribeBucket,
                    OutputKey: outputKey
                };
                const transcriptionResponse = await transcribeClient.send(new StartTranscriptionJobCommand(params));
                console.log(identityId, jobId, outputKey, JSON.stringify({uploadEvent: record['s3'], transcriptionResponse}));
                try {
                    await jobStarted(identityId, jobId, outputKey, record['s3'], transcriptionResponse);
                    console.info('Saved job details', identityId);
                } catch (error) {
                    console.error('Failed to save job details', error);
                }
            } else {
                console.error('Unexpected filename: ', fileName);
            }
        } else {
            console.error('Unexpected key: ', key);
        }
    }

    return `Processed ${event['Records'].length} uploads`;

};
