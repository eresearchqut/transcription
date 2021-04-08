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
            const jobName = uuid();
            if (matchedFileExtension) {
                const params = {
                    TranscriptionJobName: jobName,
                    LanguageCode: languageCode,
                    MediaFormat: mediaFormat(fileExtension),
                    Media: {
                        MediaFileUri: `https://s3-${region}.amazonaws.com/${bucketName}/${key}`,
                    },
                    OutputBucketName: transcribeBucket,
                    OutputKeyPrefix: `transcription/${identityId}`
                };
                const transcriptionResponse = await transcribeClient.send(new StartTranscriptionJobCommand(params));
                await jobStarted(identityId, record['s3'], transcriptionResponse).then(() => console.info('Saved job details', identityId));
            } else {
                console.error('Unexpected filename: ', fileName);
            }
        } else {
            console.error('Unexpected key: ', key);
        }
    }

    return `Processed ${event['Records'].length} uploads`;

};
