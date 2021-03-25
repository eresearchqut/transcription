import {Auth} from "aws-amplify";

const addBearerToken = (config, session) => config.headers.Authorization = `Bearer ${session.getIdToken().getJwtToken()}`;

export const addAuthHeader = (config) => {
    return new Promise((resolve) => {
        Auth.currentSession()
            .then((session) => {
                let idTokenExpire = session.getIdToken().getExpiration();
                let refreshToken = session.getRefreshToken();
                let currentTimeSeconds = Math.round(+new Date() / 1000);
                if (idTokenExpire < currentTimeSeconds) {
                    Auth.currentAuthenticatedUser()
                        .then((currentAuthenticatedUser) => {
                            currentAuthenticatedUser.refreshSession(refreshToken, (err, refreshedSession) => {
                                if (err) {
                                    Auth.signOut().then(() => console.log('Could not refresh token, signed out'));
                                } else {
                                    addBearerToken(config, refreshedSession);
                                    resolve(config);
                                }
                            });
                        })
                } else {
                    addBearerToken(config, session);
                    resolve(config);
                }
            }).catch(() => resolve(config));
    });
}
