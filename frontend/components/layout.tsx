import {Box, Stack, Text} from "@chakra-ui/layout";
import React from "react";
import {
    Button,
    DarkMode,
    Divider,
    Heading,
    IconButton,
    Image,
    LightMode,
    Link,
    SimpleGrid,
    Spacer,
    useColorMode
} from "@chakra-ui/react";


import {withAnonymous, withAuthentication} from "../context/with-auth";
import {useAuth, useLogin, useLogout} from "../context/auth-context";
import {MoonIcon, SunIcon} from "@chakra-ui/icons";

export const Layout = ({children}: any) => {

    const {colorMode, toggleColorMode} = useColorMode();
    const {
        handleLogin
    } = useLogin();

    const {
        handleLogout
    } = useLogout();

    const {state: {isAuthenticated}} = useAuth();

    return (
        <SimpleGrid
            columns={1}
            height={'100vh'}
            width={'100%'}
            gridTemplateRows={'70px 1fr 30px 30px'}
        >
            <Box bg={'blue.900'} color={'white'} width={'100%'}>
                <DarkMode>
                    <Stack direction='row' alignItems={'center'} maxWidth={'1576px'} m={'auto'} p={4}>
                        <Image
                            alt="QUT logo"
                            src="logo.png"
                            width={"40px"}
                            height={"40px"}
                        />
                        <Divider orientation='vertical'/>
                        <Heading size={"lg"}>Transcribe</Heading>
                        <Spacer/>


                        {!isAuthenticated &&
                            <Button onClick={handleLogin} variant='outline'>
                                Login
                            </Button>
                        }
                        {isAuthenticated &&
                            <Button onClick={handleLogout} variant='outline'>
                                Logout
                            </Button>
                        }

                        <IconButton variant='outline' onClick={toggleColorMode}
                                    icon={colorMode === 'light' ? <SunIcon/> : <MoonIcon/>}
                                    aria-label={`Toggle ${colorMode === 'light' ? 'Dark' : 'Light'} Mode`}/>
                    </Stack>
                </DarkMode>
            </Box>

            <Box width={'100%'}>
                <Box maxWidth={'1576px'} m={'auto'} p={4}>
                    {children}
                </Box>
            </Box>

            <Box bg={'blue.900'} color={'white'} width={'100%'}>
                <DarkMode>
                    <Stack direction='row' p={1} pl={4} pr={4} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                        <Text color={'white'} as={'b'} fontSize={"sm"} noOfLines={1}>Developed by the Office of
                            eResearch
                            QUT</Text>
                    </Stack>
                </DarkMode>
            </Box>

            <Box bg={'white'} color={'blue.900'} width={'100%'}>
                <LightMode>
                    <Stack direction='row' p={1} pl={4} pr={4} alignItems={'center'} maxWidth={'1576px'} m={'auto'}>
                        <Link href={"https://www.qut.edu.au/about/indigenous"} isExternal fontSize={"sm"}>
                            QUT acknowledges the Traditional Owners of the lands where QUT now stands.
                        </Link>
                    </Stack>
                </LightMode>
            </Box>
        </SimpleGrid>

    )
};

export default withAuthentication(Layout);
export const LoginLayout = withAnonymous(Layout);
