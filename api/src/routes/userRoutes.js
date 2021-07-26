const express = require('express');

const {getIdentityId, getRoles, getUserName, getSub} = require("../util/requestUtils");

const router = express.Router();

router.get('/', (request, response, next) => {
    const identityId = getIdentityId(request);
    const username = getUserName(request);
    const sub = getSub(request);
    const roles = getRoles(request);
    response.json({identityId, username, sub, roles});
});

router.get('/identity', (request, response, next) => {
    const identityId = getIdentityId(request);
    response.json({identityId});
});



module.exports = router;
