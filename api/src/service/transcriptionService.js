const {
    putResource
} = require('../repository/repository');


const jobStarted = (identityId, uploadEvent, transcriptionResponse) =>
    putResource(identityId, transcriptionResponse['TranscriptionJob']['TranscriptionJobName'], {uploadEvent: JSON.parse(JSON.stringify(uploadEvent)), transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse))});

const getTranscriptions = (identityId) => [];

module.exports = {
    jobStarted,
    getTranscriptions
};
