const {
    TranscribeClient,
    StartTranscriptionJobCommand,
} = require("@aws-sdk/client-transcribe");
const {
    jobStarted
} = require('../service/transcriptionService');


const region = process.env.AWS_REGION || 'ap-southeast-2';
const transcribeBucket = process.env.TRANSCRIPTION_BUCKET || 'transcriptions';
const transcribeClient = new TranscribeClient({region});

const uploadPattern = /upload\/(.*)\/(.*)\/(.*)/gm
const fileExtensionPattern = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gmi

const mediaFormat = (fileExtension) => fileExtension;

exports.handler = async (event) => {

    console.log(JSON.stringify(event));

    for (const record of event['Records']) {
        const key = record['s3']['object']['key'];
        const bucketName = record['s3']['bucket']['name'];
        console.info(key, bucketName, key.matchAll(uploadPattern))
        const [matchedKey, identityId, languageCode, fileName] = key.matchAll(uploadPattern);
        if (matchedKey) {
            const [matchedFileExtension, fileExtension] = fileName.matchAll(fileExtensionPattern);
            if (matchedFileExtension) {
                const params = {
                    TranscriptionJobName: `${identityId}-${languageCode}-${fileName}`,
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
            }
        } else {
            console.error('Unexpected key: ', key);
        }
    }

    return `Processed ${event['Records'].length} uploads`;

};
