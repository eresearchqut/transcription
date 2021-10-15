import React from "react";
import "react-app-polyfill/ie11";
import ReactDOM from "react-dom";
import { HashRouter } from "react-router-dom";

import App from "./App";
import ScrollToTop from "./ScrollToTop";

ReactDOM.render(
  <HashRouter>
    <ScrollToTop>
      <App></App>
    </ScrollToTop>
  </HashRouter>,
  document.getElementById("root")
);
