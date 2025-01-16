import {
  Button,
  Card,
  Grid,
  Heading,
  List,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useLogin } from "../context/auth-context";
import { Quotas } from "../components/quotas";
import { TRANSCRIBE_QUOTAS } from "../model";
import { formatDuration } from "date-fns";
import { ExternalLink } from "@/components/externalLink";
import { MappedIcon } from "@/components/mappedIcon";
import { NextPageWithLayout } from "@/pages/_app";
import { LoginLayout } from "../layout/layout";

const Login: NextPageWithLayout = () => {
  const styles = {
    root: {
      bgColor: { base: "gray.100", _dark: "gray.700" },
      borderColor: { base: "blue.900", _dark: "gray.800" },
    },
  };

  const { handleLogin } = useLogin();
  return (
    <Stack align={"start"} gap={{ base: 4, lg: 10 }}>
      <Card.Root
        variant={"outline"}
        size={"sm"}
        width={{ base: "100%", lg: "unset" }}
        css={styles.root}
      >
        <Card.Header>
          <Card.Title asChild>
            <Heading as={"h1"} fontSize={"4xl"} lineHeight={1} pb={4}>
              QUT audio transcription service
            </Heading>
          </Card.Title>
        </Card.Header>
        <Card.Body>Please log in to access this service.</Card.Body>
        <Card.Footer>
          <Button colorPalette={"blue"} variant={"solid"} onClick={handleLogin}>
            Log in
          </Button>
        </Card.Footer>
      </Card.Root>
      <Grid
        templateColumns={{ base: undefined, lg: "repeat(3, 1fr)" }}
        gap={4}
        pb={20}
      >
        <Card.Root size={"sm"} variant={"outline"} css={styles.root}>
          <Card.Header>
            <Card.Title asChild>
              <Heading as={"h2"} fontSize={"xl"}>
                About QUT Transcribe
              </Heading>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Text>
              This service is powered by{" "}
              <ExternalLink href={"https://aws.amazon.com/transcribe/"}>
                Amazon Transcribe <MappedIcon icon={"external-link"} />
              </ExternalLink>
              . Amazon transcribe uses a deep learning process called automatic
              speech recognition (ASR) to convert speech to text quickly and
              accurately. It can be used to transcribe audio and video files,
              and includes speaker identification. Amazon Transcribe is powered
              by a next-generation, multi-billion parameter speech foundation
              model that delivers high accuracy transcriptions for streaming and
              recorded speech.
            </Text>
          </Card.Body>
        </Card.Root>
        <Card.Root size={"sm"} variant={"outline"} css={styles.root}>
          <Card.Header>
            <Card.Title asChild>
              <Heading as={"h2"} fontSize={"xl"}>
                Storage and security
              </Heading>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            Uploaded media and generated transcriptions are:
            <List.Root>
              <List.Item>
                Stored in the Amazon Web Services (AWS) Sydney region
              </List.Item>
              <List.Item>
                Kept for {formatDuration(TRANSCRIBE_QUOTAS.storageDuration)} and
                then automatically deleted
              </List.Item>
              <List.Item>Encrypted in transit and at rest</List.Item>
              <List.Item>
                Media and transcriptions are accessible only by the uploader
              </List.Item>
              <List.Item>
                For more information refer to the:{" "}
                <ExternalLink
                  href={
                    "https://docs.aws.amazon.com/transcribe/latest/dg/security.html"
                  }
                >
                  Amazon Transcribe Security Documentation{" "}
                  <MappedIcon icon={"external-link"} display={"inline"} />
                </ExternalLink>
                .
              </List.Item>
            </List.Root>
          </Card.Body>
        </Card.Root>
        <Card.Root size={"sm"} variant={"outline"} css={styles.root}>
          <Card.Header>
            <Card.Title asChild>
              <Heading as={"h2"} fontSize={"xl"}>
                Quotas and limits
              </Heading>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <Quotas
              {...TRANSCRIBE_QUOTAS}
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
          </Card.Body>
        </Card.Root>
      </Grid>
    </Stack>
  );
};

export const getStaticProps = () => {
  return {
    props: {
      isLanding: true,
    },
  };
};

Login.getLayout = (page) => {
  return <LoginLayout isLanding={true}>{page}</LoginLayout>;
};

export default Login;
