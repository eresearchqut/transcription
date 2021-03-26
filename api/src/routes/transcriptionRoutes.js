const express = require('express');

const {getIdentityId} = require("../util/requestUtils");
// const {
//
// } = require("../service/transcriptionService");
const router = express.Router();

router.get('/identity', (request, response, next) => {
    const identityId = getIdentityId(request);
    response.json({identityId});
})


module.exports = router;
