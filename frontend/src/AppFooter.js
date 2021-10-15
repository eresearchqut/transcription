import React from "react";

export const AppFooter = () => {
  return (
    <div className="layout-footer">
      <div className="wrapper p-d-flex p-ai-center">
        <img src="assets/images/qut_logo.png" alt="qut-logo" width="40" />
        <span className="footer-text" style={{ marginLeft: "5px" }}>
          Office of eResearch
        </span>
        <span className="footer-text p-ml-auto">
          <a
            href="https://eresearchqut.atlassian.net/servicedesk/customer/portal/3/group/4/create/127"
            target="_blank"
            rel="noreferrer"
          >
            Provide Feedback
          </a>
        </span>
      </div>
    </div>
  );
};
