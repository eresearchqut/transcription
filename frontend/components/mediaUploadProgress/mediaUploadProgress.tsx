import * as React from "react";
import { FunctionComponent } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Progress,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TbFile } from "react-icons/tb";
import { Box, Stack } from "@chakra-ui/layout";
import { CheckCircleIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { AiOutlinePlaySquare } from "react-icons/ai";

export interface MediaUploadProgressProps {
  uploadProgress: Map<string, number>;
}

// TODO - states: uploading, processing

export const MediaUploadProgress: FunctionComponent<
  MediaUploadProgressProps
> = ({ uploadProgress }) => {
  console.log("progress", uploadProgress);
  return (
    uploadProgress.size > 0 && (
      <>
        {Array.from(uploadProgress.entries()).map(([fileName, progress]) => (
          <VStack key={fileName}>
            <Alert status={"info"} variant="left-accent">
              <AlertIcon as={TbFile} boxSize={[10, 12]} />
              <Box width={"95%"}>
                <AlertTitle>{fileName}</AlertTitle>
                <AlertDescription>
                  <Text>
                    Uploading...
                    <Progress hasStripe value={progress} />
                  </Text>
                </AlertDescription>
              </Box>
            </Alert>
            <Alert status={"info"} variant="left-accent" key={fileName}>
              <AlertIcon as={TbFile} boxSize={[10, 12]} />
              <Box width={"95%"}>
                <AlertTitle>{fileName}</AlertTitle>
                <AlertDescription>
                  <Text>
                    <CheckCircleIcon color={"green.600"} mr={2} mb={1} />
                    Upload successful
                  </Text>
                  <Text>
                    Transcribing...
                    <Progress hasStripe value={progress} />
                  </Text>
                </AlertDescription>
              </Box>
            </Alert>
            <Alert status={"success"} variant="left-accent" key={fileName}>
              <AlertIcon as={TbFile} boxSize={[10, 12]} />
              <Box width={"95%"}>
                <Flex>
                  <Box>
                    <AlertTitle>{fileName}</AlertTitle>
                    <AlertDescription>
                      <Text>
                        <CheckCircleIcon color={"green.600"} mr={2} mb={1} />
                        Upload successful
                      </Text>
                      <Text>
                        <CheckCircleIcon color={"green.600"} mr={2} mb={1} />
                        Transcription completed
                      </Text>
                    </AlertDescription>
                  </Box>
                  <Spacer />
                  <Stack spacing={4} direction={"row"} align={"center"}>
                    <Menu>
                      <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                        Download
                      </MenuButton>
                      <Portal>
                        <MenuList>
                          <MenuItem>Media</MenuItem>
                          <MenuItem>JSON</MenuItem>
                          <MenuItem>SRT</MenuItem>
                          <MenuItem>VTT</MenuItem>
                          <MenuItem>DOCX</MenuItem>
                        </MenuList>
                      </Portal>
                    </Menu>
                    <Button
                      variant={"outline"}
                      leftIcon={<AiOutlinePlaySquare />}
                    >
                      Play
                    </Button>
                  </Stack>
                </Flex>
              </Box>
            </Alert>
          </VStack>
        ))}
      </>
    )
  );
};

// {/*    <Grid gridTemplateColumns={"25% 1fr"} gap={4} key={index}>*/}
// {/*      <GridItem>Uploading {fileName}: </GridItem>*/}
// {/*      <GridItem>*/}
// {/*        <Progress hasStripe value={progress * 100} />*/}
// {/*      </GridItem>*/}
// {/*    </Grid>*/}
