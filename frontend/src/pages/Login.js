import React from "react";
import { Helmet } from "react-helmet";

import { Auth } from "aws-amplify";
import { BreadCrumb } from "primereact/breadcrumb";
import { Card } from "primereact/card";

const applicationName = process.env.REACT_APP_APPLICATION_NAME;

export const Login = () => {
  const pageTitle = "Login";
  const title = `${pageTitle} | ${applicationName}`;

  const home = { icon: "pi pi-home", url: "/" };
  const breadcrumbs = [
    {
      label: pageTitle,
      command: () =>
        Auth.federatedSignIn({ provider: process.env.REACT_APP_AUTH_PROVIDER }),
    },
  ];

  return (
    <React.Fragment>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <BreadCrumb model={breadcrumbs} home={home} />
      <Card>
        <h2>
          Thank you for taking part in the transcription service BETA testing!
        </h2>

        <p>
          Click the{" "}
          <a href="https://eresearchqut.atlassian.net/servicedesk/customer/portal/3/group/4/create/127">
            provide feedback
          </a>{" "}
          link in the footer to register an issue or feature request with the
          eResearch support team.
        </p>
        <h3>Supported file formats</h3>
        <ul>
          <li>wav</li>
          <li>flac</li>
          <li>amr</li>
          <li>3ga</li>
          <li>mp3</li>
          <li>mp4</li>
          <li>m4a</li>
          <li>oga</li>
          <li>ogg</li>
          <li>opus</li>
        </ul>

        <h3>Quotas and Limits</h3>

        <div
          className="p-datatable p-component"
          data-scrollselectors=".p-datatable-scrollable-body, .p-datatable-unfrozen-view .p-datatable-scrollable-body"
        >
          <div className="p-datatable-wrapper">
            <table role="grid">
              <thead className="p-datatable-thead">
                <tr role="row">
                  <th role="columnheader">Description</th>
                  <th role="columnheader">Quota/Limit</th>
                </tr>
              </thead>
              <tbody className="p-datatable-tbody">
                <tr role="row">
                  <td role="cell">
                    Minimum audio file duration, in milliseconds (ms)
                  </td>
                  <td role="cell">500</td>
                </tr>
                <tr role="row">
                  <td role="cell">Maximum audio file duration</td>
                  <td role="cell">4:00:00 (four) hours, 14,400 seconds</td>
                </tr>
                <tr role="row">
                  <td role="cell">Maximum audio file size</td>
                  <td role="cell">2 GB</td>
                </tr>
                <tr role="row">
                  <td role="cell">
                    Number of days that transcriptions are retained
                  </td>
                  <td role="cell">14</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <h3>Powered by Amazon Transcribe</h3>
        <blockquote>
          <p>
            Amazon Transcribe uses a deep learning process called automatic
            speech recognition (ASR) to convert speech to text quickly and
            accurately. Amazon Transcribe can be used to transcribe customer
            service calls, automate subtitling, and generate metadata for media
            assets to create a fully searchable archive. You can use Amazon
            Transcribe Medical to add medical speech to text capabilities to
            clinical documentation applications.
          </p>
          <footer>
            <cite>
              <a href="https://aws.amazon.com/transcribe/">Amazon Transcribe</a>
            </cite>
          </footer>
        </blockquote>
      </Card>
    </React.Fragment>
  );
};
