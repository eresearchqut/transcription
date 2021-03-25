import React from 'react';

import {Card} from "primereact/card";
import {BreadCrumb} from "primereact/breadcrumb";
import {Auth} from "aws-amplify";
import {Helmet} from "react-helmet";


const applicationName = process.env.REACT_APP_APPLICATION_NAME;

export const Login = () => {

    const pageTitle = 'Login'
    const title = `${pageTitle} | ${applicationName}`;

    const home = {icon: "pi pi-home", url: "/"}
    const breadcrumbs = [{
        label: pageTitle,
        command: () => Auth.federatedSignIn({provider: process.env.REACT_APP_AUTH_PROVIDER})
    }];

    return (
        <React.Fragment>
            <Helmet>
                <title>{title}</title>
            </Helmet>
            <BreadCrumb model={breadcrumbs} home={home}/>
            <Card title={applicationName} >

                <div className="p-grid p-formgrid">
                    <div className="p-field p-col-12">

                    </div>

                </div>
            </Card>
        </React.Fragment>

    );
}
