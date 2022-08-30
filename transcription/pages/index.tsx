import type {NextPage} from 'next'
import * as React from "react"
import {useEffect, useState} from "react"
import {withLayout} from '@moxy/next-layout'
import Layout from '../components/layout'
import {Heading} from "@chakra-ui/react";
import {getAuthHeader} from "../context/auth-context";

const Home: NextPage = () => {

    const [transcriptions, setTranscriptions] = useState<any[]>([]);
    const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3001";

    useEffect(() => {
        const load = async () => {
            await
                fetch(`${endpoint}/transcription`, {
                    headers: getAuthHeader(),
                })
                    .then((res) => res.json())
                    .then((response) => setTranscriptions(() => response))

        };
        load().then(() => console.log(transcriptions));
    }, [])


    return (

        <Heading>Home</Heading>


    )
}

export default withLayout(<Layout/>)(Home);
