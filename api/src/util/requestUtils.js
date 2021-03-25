const getClaims = (request) => {
    const token = request.header("Authorization");
    if (token) {
        try {
            const base64decoded = Buffer.from(token.split(".")[1], "base64").toString("ascii");
            const claims = JSON.parse(base64decoded);
            console.info(claims);
            return claims;
        } catch (e) {
            console.error("Invalid JWT token. Cannot resolve claims.", e);
        }
    } else {
        console.warn(`No token found in Authorization header. Cannot resolve claims.`);
    }
    return {};
}

const getUserName = (request) => {
    let username = "anonymous";
    const claims = getClaims(request);
    if (claims['username']) {
        username = claims.username;
    } else if (claims["custom:username"]) {
        username = claims["custom:username"];
    } else if (claims["identities"] && claims["identities"][0] && claims["identities"][0]["userId"]) {
        username = claims["identities"][0]["userId"];
    } else if (claims["cognito:username"]) {
        username = claims["cognito:username"];
    } else {
        console.warn(`No username claim found in claims.`);
    }
    console.log(username);
    return username;
}
const getIdentityId = (request) => getClaims(request)['custom:qutIdentityId'];

module.exports = {
    getIdentityId,
    getUserName
}
