const {
    putResource,
    updateResource,
    getResources
} = require('../repository/repository');

const jobStarted = (identityId, jobId, uploadEvent, transcriptionResponse) =>
    putResource(identityId, jobId, {
        uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
        transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse))
    });

const jobStatusUpdated = (identityId, jobId, jobStatusUpdated) =>
    updateResource(identityId, jobId, 'jobStatusUpdated',  JSON.parse(JSON.stringify(jobStatusUpdated)));

const getTranscriptions = (identityId) =>
    getResources(identityId);

module.exports = {
    jobStarted,
    getTranscriptions
};
