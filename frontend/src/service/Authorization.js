import {Auth} from "aws-amplify";

export const addAuthHeader = async config => {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken()
    if (token) {
        config.headers.Authorization = token;
    }
    return config;
};

