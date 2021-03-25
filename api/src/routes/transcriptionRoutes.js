const express = require('express');

const {getIdentityId} = require("../util/requestUtils");
const {
    deleteTranscription,
    putTranscription,
    getTranscription
} = require("../service/transcriptionService");
const router = express.Router();


router.get('/:id', (request, response, next) => {
    const {id} = request.params;
    const identityId = getIdentityId(request);
    return getTranscription(id, identityId)
        .then(transcription => response.json(transcription))
        .catch(onerror => next(onerror));
})


router.delete('/:id', (request, response, next) => {
    const {id} = request.params;
    const identityId = getIdentityId(request);
    return deleteTranscription(id, identityId)
        .then(transcription => response.json(transcription))
        .catch(onerror => next(onerror));
})

router.put('/', (request, response, next) => {
    const identityId = getIdentityId(request);
    return putTranscription(request.body, identityId)
        .then(transcription => response.json(transcription))
        .catch(onerror => next(onerror));
})

module.exports = router;
