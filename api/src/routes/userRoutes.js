const express = require('express');

const {getIdentityId, getRoles, getUserName} = require("../util/requestUtils");

const router = express.Router();

router.get('/', (request, response, next) => {
    const identityId = getIdentityId(request);
    const username = getUserName(request);
    const roles = getRoles(request);
    response.json({identityId, username, roles});
});

router.get('/identity', (request, response, next) => {
    const identityId = getIdentityId(request);
    response.json({identityId});
});



module.exports = router;
