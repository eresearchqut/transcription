import * as React from "react"
import {ListItem, Table, Tbody, Td, Thead, Tr, UnorderedList,} from '@chakra-ui/react'

const Quotas = () => {

    return (
        <Table>
            <Thead>
                <Tr>
                    <Td>Description</Td>
                    <Td>Quota/Limit/Type</Td>
                </Tr>
            </Thead>
            <Tbody>
                <Tr>
                    <Td>
                        Minimum audio file duration, in milliseconds (ms)
                    </Td>
                    <Td>500</Td>
                </Tr>
                <Tr>
                    <Td>Maximum audio file duration</Td>
                    <Td>4:00:00 (four) hours, 14,400 seconds</Td>
                </Tr>
                <Tr>
                    <Td>Maximum audio file size</Td>
                    <Td>2 GB</Td>
                </Tr>
                <Tr>
                    <Td>
                        Number of days that transcriptions are retained
                    </Td>
                    <Td>14</Td>
                </Tr>
                <Tr>
                    <Td>
                        Supported File Formats
                    </Td>
                    <Td>
                        <UnorderedList>
                            <ListItem>wav</ListItem>
                            <ListItem>flac</ListItem>
                            <ListItem>amr</ListItem>
                            <ListItem>3ga</ListItem>
                            <ListItem>mp3</ListItem>
                            <ListItem>mp4</ListItem>
                            <ListItem>m4a</ListItem>
                            <ListItem>oga</ListItem>
                            <ListItem>ogg</ListItem>
                            <ListItem>opus</ListItem>
                        </UnorderedList></Td>
                </Tr>
            </Tbody>
        </Table>


    )
}

export default Quotas;
