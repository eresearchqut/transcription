import {Box, Stack, Text} from "@chakra-ui/layout";
import React from "react";
import {
    Button,
    Divider,
    Heading,
    Image,
    Link,
    SimpleGrid,
    Spacer,
    useColorMode,
    useColorModeValue
} from "@chakra-ui/react";


export const Layout = ({children}: any) => {

    const {colorMode, toggleColorMode} = useColorMode();
    // const bg = useColorModeValue('red.500', 'red.200')

    return (
        <SimpleGrid
            columns={1}
            height={'100vh'}
            width={'100%'}
            gridTemplateRows={'60px 1fr 30px 30px'}
        >
            <Box bg={'blue.900'} color={'white'} width={'100%'}>
                <Stack direction='row' p={2} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                    <Image
                        alt="QUT logo"
                        src="logo.png"
                        width={"40px"}
                        height={"40px"}
                    />
                    <Divider orientation='vertical'/>
                    <Heading>Transcribe</Heading>
                    <Spacer/>
                    <Button onClick={toggleColorMode}>
                        Toggle {colorMode === 'light' ? 'Dark' : 'Light'}
                    </Button>
                </Stack>
            </Box>

            <Box width={'100%'} p={2}>
                <Box p={2} shadow='md' m={'auto'} borderWidth='1px' maxWidth={'1576px'}>
                    {children}
                </Box>
            </Box>

            <Box bg={'blue.900'} color={'white'} width={'100%'}>
                <Stack direction='row' p={1} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                    <Text color={'white'} as={'b'} fontSize={"sm"} noOfLines={1}>Developed by the Office of
                        eResearch
                        QUT</Text>
                </Stack>
            </Box>

            <Box bg={'white'} color={'blue.900'} width={'100%'}>
                <Stack direction='row' p={1} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                    <Link href={"https://www.qut.edu.au/about/indigenous"} isExternal fontSize={"sm"}>
                        QUT acknowledges the Traditional Owners of the lands where QUT now stands.
                    </Link>
                </Stack>
            </Box>
        </SimpleGrid>

    )
};

export default Layout;

