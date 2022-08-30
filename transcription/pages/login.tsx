import type {NextPage} from 'next'
import * as React from "react"
import {withLayout} from '@moxy/next-layout'
import {LoginLayout} from '../components/layout'
import Quotas from "../components/quotas";
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, Flex, Heading, Spacer} from "@chakra-ui/react";
import {Box} from "@chakra-ui/layout";
import FileUpload from "../components/fileUpload";

const Login: NextPage = () => {


    return (
        <>
            <Flex minWidth='max-content' alignItems='center' gap='2' m={4}>
                <Box p='2'>
                    <Heading size={"md"}>Login Required</Heading>
                </Box>
                <Spacer/>
            </Flex>
            <Quotas/>
        </>

    )
}

export default withLayout(<LoginLayout/>)(Login);
