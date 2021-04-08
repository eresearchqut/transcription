const express = require('express');

const {getIdentityId} = require("../util/requestUtils");
const {getTranscriptions} = require("../service/transcriptionService");
const router = express.Router();

router.get('/', (request, response, next) => {
    const identityId = getIdentityId(request);
    const transcriptions = getTranscriptions(identityId);
    response.json(transcriptions);
});



module.exports = router;
