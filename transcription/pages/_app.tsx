import '../styles/globals.css'
import type {AppProps} from 'next/app'
import theme from "./theme";
import {ChakraProvider} from "@chakra-ui/react";
import { LayoutTree } from '@moxy/next-layout';

function App({Component, pageProps}: AppProps) {
    return <ChakraProvider theme={theme}>

        <LayoutTree
            Component={ Component }
            pageProps={ pageProps } />


    </ChakraProvider>
}

export default App
