import type {NextPage} from 'next'
import * as React from "react"
import {
    Box,
    Button,
    Divider,
    Heading,
    Image,
    Link,
    SimpleGrid,
    Spacer,
    Stack,
    Text,
    useColorMode
} from '@chakra-ui/react'

const Home: NextPage = () => {

    const {colorMode, toggleColorMode} = useColorMode()

    return (
        <SimpleGrid
            columns={1}
            height={'100vh'}
            width={'100%'}
            gridTemplateRows={'90px 1fr 30px 30px'}
        >
            <Box bg={'blue.900'} color={'white'} width={'100%'} >
                <Stack direction='row' pt={4} alignItems={'center'} maxWidth={'1576px'} m={'auto'} >
                    <Image
                        alt="QUT logo"
                        src="logo.png"
                        width={"60px"}
                        height={"60px"}
                    />
                    <Divider orientation='vertical'/>
                    <Heading>Transcribe</Heading>
                    <Spacer/>
                    <Button onClick={toggleColorMode} >
                        Toggle {colorMode === 'light' ? 'Dark' : 'Light'}
                    </Button>
                </Stack>
            </Box>

            <Box width={'100%'}>
                <Box p={5} shadow='md' m={'auto'}  mt={4} mb={4} borderWidth='1px' maxWidth={'1576px'} >
                    <Heading>Transcribe</Heading>
                </Box>
            </Box>

            <Box bg={'blue.900'} color={'white'} width={'100%'}>
                <Stack direction='row' pt={1} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                    <Text color={'white'} as={'b'} fontSize={"sm"} noOfLines={1}>Developed by the Office of
                        eResearch
                        QUT</Text>

                </Stack>
            </Box>
            <Box bg={'white'} color={'blue.900'} width={'100%'}>
                <Stack direction='row' pt={1} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                    <Link href={"https://www.qut.edu.au/about/indigenous"} isExternal fontSize={"sm"}>
                        QUT acknowledges the Traditional Owners of the lands where QUT now stands.
                    </Link>
                </Stack>
            </Box>
        </SimpleGrid>

    )
}

export default Home
