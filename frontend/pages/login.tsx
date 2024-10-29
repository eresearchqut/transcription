import type { NextPage } from "next";
import * as React from "react";
import { withLayout } from "@moxy/next-layout";
import { LoginLayout } from "../layout/layout";

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Grid,
  Heading,
  Link,
  ListItem,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { useLogin } from "../context/auth-context";
import { Quotas } from "../components/quotas";
import { TRANSCRIBE_PROPS } from "../model";
import { formatDuration } from "date-fns";

const Login: NextPage = () => {
  const { handleLogin } = useLogin();

  return (
    <Stack align={"start"} gap={{ base: 4, lg: 10 }}>
      <Card width={{ base: "100%", lg: "unset" }}>
        <CardHeader>
          <Heading as={"h2"}>QUT audio transcription service</Heading>
        </CardHeader>
        <CardBody>
          <Text>Please log in to access this service.</Text>
        </CardBody>
        <CardFooter>
          <Button variant={"solid"} colorScheme={"blue"} onClick={handleLogin}>
            Login
          </Button>
        </CardFooter>
      </Card>
      <Grid
        templateColumns={{ base: undefined, lg: "repeat(3, 1fr)" }}
        gap={4}
        pb={20}
      >
        <Card>
          <CardHeader>
            <Heading as={"h2"}>About QUT Transcribe</Heading>
          </CardHeader>
          <CardBody>
            <Text>
              This service is powered by{" "}
              <Link
                href={"https://aws.amazon.com/transcribe/"}
                isExternal
                mt={4}
              >
                Amazon Transcribe <ExternalLinkIcon />
              </Link>
              .
            </Text>
            <Text>
              Amazon transcribe uses a deep learning process called automatic
              speech recognition (ASR) to convert speech to text quickly and
              accurately. It can be used to transcribe audio and video files,
              with speaker identification. Amazon Transcribe is powered by a
              next-generation, multi-billion parameter speech foundation model
              that delivers high accuracy transcriptions for streaming and
              recorded speech.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Heading as={"h2"}>Storage and security</Heading>
          </CardHeader>
          <CardBody>
            <Text>Uploaded media and generated transcriptions are:</Text>
            <UnorderedList>
              <ListItem>
                Stored in the Amazon Web Services (AWS) Sydney region
              </ListItem>
              <ListItem>
                Kept for {formatDuration(TRANSCRIBE_PROPS.storageDuration)} and
                then automatically deleted
              </ListItem>
              <ListItem>
                Encrypted in transit and at rest Media and transcriptions are
                accessible only by the uploader
              </ListItem>
              <ListItem>
                For more information refer to the:{" "}
                <Link
                  href={
                    "https://docs.aws.amazon.com/transcribe/latest/dg/security.html"
                  }
                  isExternal
                  mt={4}
                >
                  Amazon Transcribe Security Documentation <ExternalLinkIcon />
                </Link>
                .
              </ListItem>
            </UnorderedList>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Heading as={"h2"}>Quotas and limits</Heading>
          </CardHeader>
          <CardBody>
            <Quotas
              {...TRANSCRIBE_PROPS}
              supportedFileFormats={[
                "wav",
                "flac",
                "amr",
                "3ga",
                "mp3",
                "mp4",
                "m4a",
                "oga",
                "ogg",
                "opus",
              ]}
            />
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
};

export default withLayout(<LoginLayout isLanding={true} />)(Login);
