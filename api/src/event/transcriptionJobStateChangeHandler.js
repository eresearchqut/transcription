const {
    jobStatusUpdated
} = require('../service/transcriptionService');

exports.handler = async (event) => {
    console.log(event)
    const [identityId, jobId] = event?.detail?.TranscriptionJobName?.split('_');
    await jobStatusUpdated(identityId, jobId, event);
    return "Transcription job status updated";
};
