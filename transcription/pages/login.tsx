import type {NextPage} from 'next'
import * as React from "react"
import {withLayout} from '@moxy/next-layout'
import {LoginLayout} from '../components/layout'
import Quotas from "../components/quotas";
import {Heading, Link, ListItem, Text, UnorderedList, VStack,} from "@chakra-ui/react";
import {ExternalLinkIcon} from "@chakra-ui/icons";

const Login: NextPage = () => {


    return (

        <VStack p='4' spacing={4} align='stretch'>
            <Heading size={"md"}>QUT Audio Transcription Service</Heading>
            <Text>Login required.</Text>

            <Heading size={"md"}>Service Quotas and Limits</Heading>
            <Quotas/>

            <Heading size={"md"}>Powered by Amazon Transcribe</Heading>
            <blockquote>Amazon Transcribe uses a deep learning process called automatic speech recognition (ASR) to
                convert speech to text quickly and accurately. Amazon Transcribe can be used to transcribe customer
                service calls, automate subtitling, and generate metadata for media assets to create a fully
                searchable
                archive. You can use Amazon Transcribe Medical to add medical speech to text capabilities to
                clinical
                documentation applications.
            </blockquote>
            <Link href={"https://aws.amazon.com/transcribe/"} isExternal mt={4}>Amazon
                Transcribe <ExternalLinkIcon/></Link>

            <Heading size={"md"}>Data storage and security</Heading>
            <Text>
                Uploaded media and generated transcriptions are:
            </Text>
            <UnorderedList stylePosition={"inside"}>
                <ListItem>Stored in the Amazon Web Services (AWS) Sydney region</ListItem>
                <ListItem>Kept for 14 days and then automatically deleted</ListItem>
                <ListItem>Encrypted in transit and at rest</ListItem>
                <ListItem>Media and transcriptions are accessible only by the uploader</ListItem>
            </UnorderedList>

            <Text>For more
                information refer to the: <Link
                    href={"https://docs.aws.amazon.com/transcribe/latest/dg/security.html"} isExternal mt={4}>Amazon
                    Transcribe Security Documentation <ExternalLinkIcon/></Link></Text>
        </VStack>

    )
}

export default withLayout(<LoginLayout/>)(Login);
