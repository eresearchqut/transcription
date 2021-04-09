const {
    putResource,
    getResources
} = require('../repository/repository');


const jobStarted = (identityId, uploadEvent, transcriptionResponse) =>
    putResource(identityId, transcriptionResponse['TranscriptionJob']['TranscriptionJobName'], {
        uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
        transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse))
    });

const getTranscriptions = (identityId) =>
    getResources(identityId).then(items => items.map(item => item['data']));

module.exports = {
    jobStarted,
    getTranscriptions
};
