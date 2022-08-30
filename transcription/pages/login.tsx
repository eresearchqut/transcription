import type {NextPage} from 'next'
import * as React from "react"
import {withLayout} from '@moxy/next-layout'
import {LoginLayout} from '../components/layout'
import Quotas from "../components/quotas";
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, Heading} from "@chakra-ui/react";

const Login: NextPage = () => {


    return (
        <>

            <Heading>Login</Heading>
            <Quotas/>
        </>

    )
}

export default withLayout(<LoginLayout/>)(Login);
