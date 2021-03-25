const {
    deleteResource,
    getResource,
    putResource
} = require('../repository/repository');


const deleteTranscription = (id, identityId) => deleteResource(identityId, id);

const getTranscription = (id, identityId) =>
    getResource(identityId, id);

const putTranscription = (id, transcription, identityId) =>
    putResource(identityId, id, transcription)


module.exports = {
    deleteTranscription,
    putTranscription,
    getTranscription
};
