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

const uploadPattern = /upload\/.*([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/(.*)\/(.*)/gm
const fileExtensionPattern = /\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gmi

exports.handler = async (event) => {

    for (const record in event['Records']) {
        const {s3} = record;
        const {key, bucketName} = s3['object'];
        const [identityId, languageCode, fileName] = key.match(uploadPattern);
        const [fileExtension] = fileName.match(fileExtensionPattern);
        const params = {
            TranscriptionJobName: `${identityId}-${languageCode}-${fileName}`,
            LanguageCode: languageCode,
            MediaFormat: fileExtension,
            Media: {
                MediaFileUri: `https://s3-${region}.amazonaws.com\`/${bucketName}/${key}`,
            },
            OutputBucketName: transcribeBucket,
            OutputKeyPrefix: `transcription/${identityId}`
        };
        const transcriptionResponse = await transcribeClient.send(new StartTranscriptionJobCommand(params));
        await jobStarted(identityId, s3, transcriptionResponse).then(() => console.info('Saved job details', identityId, s3, transcriptionResponse));
    }

    return `Processed ${event['Records'].length} uploads`;

};
