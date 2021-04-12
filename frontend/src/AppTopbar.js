import React, {useEffect, useState} from 'react';
import {Auth} from 'aws-amplify';
import {Menubar} from 'primereact/menubar';
import {Button} from 'primereact/button';
import {useHistory} from "react-router-dom";
import {Divider} from "primereact/divider";
import {Chip} from "primereact/chip";
import {UserService} from './service/UserService';

export const AppTopbar = () => {

    const [user, setUser] = useState(null);
    const userService = new UserService();

    useEffect(() => {
        const getUser = async () => {
            try {
                await Auth.currentAuthenticatedUser();
                const user = await userService.getUser();
                setUser(user);
            } catch {};
        }
        getUser().then(r => {console.log("Fetched User Details")});
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    const history = useHistory();

    const menuItems = [
        {label: 'My Transcriptions', icon: 'pi pi-fw pi-bars', command: () => history.push('/transcriptions')},
    ];

    const profileAndLogout = () => (
        <div className="p-d-flex">
            <Chip size="large"
                  template={<React.Fragment><span className="p-chip-icon pi pi-user" title={user['username']}
                                                  aria-label={user['username']}/>
                      <span className="p-chip-text" title={user['username']}
                            aria-label={user['username']}>{user['username']}</span>
                  </React.Fragment>}/>
            <Divider layout="vertical"/>
            <Button label="Log Out" icon="pi pi-sign-out"
                    className="p-link"
                    onClick={() => Auth.signOut({global: false})}/>
        </div>
    );

    const login = () => {
        Auth.federatedSignIn({provider: process.env.REACT_APP_AUTH_PROVIDER})
            .then(() => console.log('User initiated login'));
    }

    const loginMenu = () => (
        <div className="p-d-flex">
            <Divider layout="vertical"/>
            <Button label="Log In" icon="pi pi-sign-in"
                    title={`Log in provider: ${process.env.REACT_APP_AUTH_PROVIDER}`}
                    className="p-link"
                    onClick={login}/>
        </div>
    );

    if (user) {
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
