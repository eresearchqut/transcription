import type {NextPage} from 'next'
import * as React from "react"
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'
import Quotas from "../components/quotas";
import {Heading} from "@chakra-ui/react";

const Home: NextPage = () => {


    return (

        <Heading>Home</Heading>


    )
}

export default withLayout(<Layout/>)(Home);
