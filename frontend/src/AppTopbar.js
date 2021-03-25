import React, {useEffect, useState} from 'react';
import {Auth} from 'aws-amplify';
import {Menubar} from 'primereact/menubar';
import {Button} from 'primereact/button';
import {useHistory} from "react-router-dom";
import {Divider} from "primereact/divider";
import {Chip} from "primereact/chip";


export const AppTopbar = () => {

    const [profile, setProfile] = useState(null);


    useEffect(() => {
        let isCancelled = false;
        return () => {
            isCancelled = true;
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const history = useHistory();

    const menuItems = [
        {label: 'My Transcriptions', icon: 'pi pi-fw pi-check-square', command: () => history.push('/transcriptions')},
    ];


    const profileAndLogout = () => (

        <div className="p-d-flex">
            <Chip size="large"
                  template={<React.Fragment><span className="p-chip-icon pi pi-user" title={profile['label']}
                                                  aria-label={profile['label']}/>
                      <span className="p-chip-text" title={profile['label']}
                            aria-label={profile['label']}>{profile['name']}</span>
                  </React.Fragment>}/>
            <Divider layout="vertical"/>
            <Button label="Log Out" icon="pi pi-sign-out"
                    className="p-link"
                    onClick={() => Auth.signOut({global: false})}/>
        </div>

    );

    const login = (event) => {
        Auth.federatedSignIn({provider: process.env.REACT_APP_AUTH_PROVIDER});
    }

    const loginMenu = () => (

        <div className="p-d-flex">
            <Divider layout="vertical"/>
            <Button label="Log In" icon="pi pi-sign-in" title={`Log in provider: ${process.env.REACT_APP_AUTH_PROVIDER}`}
                    className="p-link"
                    onClick={login}/>
        </div>

    );

    if (profile) {
        return (
            <div className="layout-topbar">
                <Menubar model={menuItems} end={profileAndLogout}/>
            </div>
        );
    }

    return <div className="layout-topbar">
        <Menubar end={loginMenu}/>
    </div>


}
