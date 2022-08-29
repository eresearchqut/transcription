import {extendTheme, type ThemeConfig} from '@chakra-ui/react';

const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: false,
}

const colors = {

    blue: {
        900: '#012A4C'
    },
    

}


const theme = extendTheme({config, colors})
export default theme