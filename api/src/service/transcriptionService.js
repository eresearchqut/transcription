const {
    putResource
} = require('../repository/repository');


const jobStarted = (identityId, uploadEvent, transcriptionResponse) =>
    putResource(identityId, transcriptionResponse['TranscriptionJob']['TranscriptionJobName'], {uploadEvent, transcriptionResponse});

const getTranscriptions = (identityId) => [];

module.exports = {
    jobStarted,
    getTranscriptions
};
