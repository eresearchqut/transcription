import type {NextPage} from 'next'
import * as React from "react"
import {Heading} from '@chakra-ui/react'
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'

const Home: NextPage = () => {


    return (

        <Heading>Transcribe</Heading>


    )
}

export default withLayout(<Layout variant="light"/>)(Home);
