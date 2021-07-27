import { Auth } from "aws-amplify";

export const addAuthHeader = async (config) => {
  try {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    if (token) {
      config.headers.Authorization = token;
    }
  } catch (e) {
    // Cannot retrieve a new session
    console.error(e);
    await Auth.federatedSignIn({
      provider: process.env.REACT_APP_AUTH_PROVIDER,
    });
  }
  return config;
};
