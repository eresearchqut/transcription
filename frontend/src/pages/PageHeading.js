import React from "react";
import { Helmet } from "react-helmet";

const applicationName = process.env.REACT_APP_APPLICATION_NAME;

export const PageHeading = ({ pageTitle }) => {
  const title = `${pageTitle} | ${applicationName}`;
  return (
    <React.Fragment>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <h1>{pageTitle}</h1>
    </React.Fragment>
  );
};

export default PageHeading;
