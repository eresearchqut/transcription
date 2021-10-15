import React, { useEffect, useState } from "react";
import { Redirect, Route } from "react-router-dom";

import Amplify, { Auth, Hub, Logger } from "aws-amplify";
import classNames from "classnames";
import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "primereact/resources/primereact.min.css";
import "primereact/resources/themes/md-light-deeppurple/theme.css";
import "prismjs/themes/prism-coy.css";

import "./App.scss";
import { AppFooter } from "./AppFooter";
import { AppTopbar } from "./AppTopbar";
import "./layout/flags/flags.css";
import "./layout/layout.scss";
import { Login } from "./pages/Login";
import { Transcriptions } from "./pages/Transcriptions";

Amplify.configure({
  Auth: {
    identityPoolId: process.env.REACT_APP_AUTH_IDENTITY_POOL_ID,
    region: process.env.REACT_APP_AWS_REGION || "ap-southeast-2",
    userPoolId: process.env.REACT_APP_AUTH_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_AUTH_USER_WEB_CLIENT_ID,
    mandatorySignIn: true,
    oauth: {
      domain: process.env.REACT_APP_AUTH_DOMAIN,
      scope: [
        "phone",
        "email",
        "profile",
        "openid",
        "aws.cognito.signin.user.admin",
      ],
      redirectSignIn: process.env.REACT_APP_AUTH_SIGN_IN_REDIRECT,
      redirectSignOut: process.env.REACT_APP_AUTH_SIGN_OUT_REDIRECT,
      responseType: "token",
    },
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_TRANSCRIPTION_BUCKET,
      region: process.env.REACT_APP_AWS_REGION || "ap-southeast-2",
    },
  },
});

const logger = new Logger("auth-logger");
const App = () => {
  const [inputStyle] = useState("solid");
  const [ripple] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    Auth.currentUserInfo()
      .then((currentUserInfo) =>
        currentUserInfo ? setLoggedIn(true) : setLoggedIn(false)
      )
      .catch(() => setLoggedIn(false));
  }, []);

  const wrapperClass = classNames("layout-wrapper", {
    "p-input-filled": inputStyle === "solid",
    "p-ripple-disabled": ripple === false,
  });

  const listener = (data) => {
    switch (data.payload.event) {
      case "signIn":
        logger.info("user signed in");
        setLoggedIn(true);
        break;
      case "signUp":
        logger.info("user signed up");
        break;
      case "signOut":
        logger.info("user signed out");
        setLoggedIn(false);
        break;
      case "signIn_failure":
        logger.error("user sign in failed");
        break;
      case "tokenRefresh":
        logger.info("token refresh succeeded");
        break;
      case "tokenRefresh_failure":
        logger.error("token refresh failed");
        break;
      case "configured":
        logger.info("the Auth module is configured");
        break;
      default:
        logger.info(data.payload.event);
        break;
    }
  };

  Hub.listen("auth", listener);

  if (loggedIn) {
    return (
      <div className={wrapperClass}>
        <header>
          <AppTopbar />
        </header>

        <main className="layout-main">
          <Route path="/" notExact component={Transcriptions} />
        </main>

        <footer>
          <AppFooter />
        </footer>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <header>
        <AppTopbar />
      </header>

      <main className="layout-main">
        <Redirect from="/" to="/login" exact />
        <Route path="/login" exact component={Login} />
      </main>

      <footer>
        <AppFooter />
      </footer>
    </div>
  );
};

export default App;
