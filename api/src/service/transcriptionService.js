const {
    deleteResource,
    getResource,
    putResource
} = require('../repository/repository');








const deleteTranscription = (transcriptionId, identityId) =>
    deleteResource(transcriptionResourceType, transcriptionId, identityId)
        .then(() => deleteParentResources(transcriptionResourceType, transcriptionId));

const getTranscription = (id, identityId) =>
    getResource( , id, identityId);



const putTranscription = (transcription, identityId) => {
    const {id, project} = transcription;
}


module.exports = {
    deleteTranscription,
    putTranscription,
    getTranscription
};
