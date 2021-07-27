const {
  putResource,
  updateResource,
  getResources,
} = require("../repository/repository");

const jobStarted = (
  identityId,
  jobId,
  outputKey,
  uploadEvent,
  transcriptionResponse,
  metadata
) =>
  putResource(identityId, jobId, {
    outputKey,
    uploadEvent: JSON.parse(JSON.stringify(uploadEvent)),
    transcriptionResponse: JSON.parse(JSON.stringify(transcriptionResponse)),
    metadata: JSON.parse(JSON.stringify(metadata)),
  });

const jobStatusUpdated = (identityId, jobId, jobStatusUpdated) =>
  updateResource(
    identityId,
    jobId,
    "jobStatusUpdated",
    JSON.parse(JSON.stringify(jobStatusUpdated))
  );

const downloadKey = (identityId, jobId, downloadKey) =>
  updateResource(identityId, jobId, "downloadKey", downloadKey);

const getTranscriptions = (identityId) => getResources(identityId);

module.exports = {
  jobStarted,
  jobStatusUpdated,
  getTranscriptions,
  downloadKey,
};
