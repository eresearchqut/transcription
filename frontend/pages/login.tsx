import {
  Box,
  Card,
  Grid,
  Heading,
  List,
  Stack,
  StackSeparator,
  Text,
  VStack,
} from "@chakra-ui/react";
import { TRANSCRIBE_QUOTAS } from "model";
import { formatDuration } from "date-fns";
import { ExternalLink } from "@/components/externalLink";
import { handleLogin, NextPageWithLayout } from "@/pages/_app";
import SUPPORTED_LANGUAGES_SOURCE from "@/public/supported_transcription_languages.json";
import SUPPORTED_TRANSLATION_LANGUAGES_SOURCE from "@/public/supported_translation_languages.json";
import { signOut } from "aws-amplify/auth";
import { FunctionComponent, PropsWithChildren } from "react";
import { bytesToSize } from "../inputs/filePicker";
import Layout from "../layout/layout";
import { useAuth } from "../context/auth-context";

const SUPPORTED_UPLOAD_FILE_FORMATS = [
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
];
const supportedInputLanguagesCount = Object.keys(
  SUPPORTED_LANGUAGES_SOURCE,
).length;
const supportedOutputLanguagesCount = Object.keys(
  SUPPORTED_TRANSLATION_LANGUAGES_SOURCE,
).length;
const MAX_SELECTED_INPUT_LANGUAGES = 5;
const MAX_SELECTED_OUTPUT_LANGUAGES = 1;
const limitSections = [
  {
    heading: "Uploaded media",
    limits: [
      {
        label: "Supported file formats",
        value: SUPPORTED_UPLOAD_FILE_FORMATS.join(", "),
      },
      {
        label: "Minimum duration",
        value: formatDuration(TRANSCRIBE_QUOTAS.minimumDuration),
      },
      {
        label: "Maximum duration",
        value: formatDuration(TRANSCRIBE_QUOTAS.maximumDuration),
      },
      {
        label: "Maximum file size",
        value: bytesToSize(TRANSCRIBE_QUOTAS.maximumFileSizeBytes),
      },
    ],
  },
  {
    heading: "Translations",
    limits: [
      {
        label: "Input languages",
        value: (
          <>
            <ExternalLink
              href={
                "https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html"
              }
            >
              {supportedInputLanguagesCount} supported
            </ExternalLink>
            , up to {MAX_SELECTED_INPUT_LANGUAGES} selected at once.
          </>
        ),
      },
      {
        label: "Output languages",
        value: (
          <>
            <ExternalLink
              href={
                "https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html"
              }
            >
              {supportedOutputLanguagesCount} supported
            </ExternalLink>
            , up to {MAX_SELECTED_OUTPUT_LANGUAGES} selected at once.
          </>
        ),
      },
    ],
  },
  {
    heading: "Summaries",
    limits: [
      {
        label: "Input",
        value: "Up to 200K tokens.",
      },
      {
        label: "Output",
        value: "Up to 1,000 tokens, prompted under 100 words.",
      },
    ],
  },
];

const Login: NextPageWithLayout = () => {
  const styles = {
    root: {
      bgColor: { base: "gray.100", _dark: "gray.700" },
    },
  };

  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }}
      gap={4}
      pb={20}
      alignItems={"stretch"}
    >
      <Card.Root
        size={"sm"}
        variant={"outline"}
        css={styles.root}
        height={"100%"}
      >
        <Card.Header>
          <Card.Title asChild>
            <Heading as={"h2"} fontSize={"xl"}>
              About QUT Transcribe
            </Heading>
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align={"stretch"}>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                Transcription
              </Heading>
              <Text>
                This service is powered by{" "}
                <ExternalLink href={"https://aws.amazon.com/transcribe/"}>
                  Amazon Transcribe
                </ExternalLink>
                . Amazon transcribe uses a deep learning process called
                automatic speech recognition (ASR) to convert speech to text
                quickly and accurately. It can be used to transcribe audio and
                video files, and includes speaker identification. Amazon
                Transcribe is powered by a next-generation, multi-billion
                parameter speech foundation model that delivers high accuracy
                transcriptions for streaming and recorded speech.
              </Text>
            </Box>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                Translation
              </Heading>
              <Text>
                Once your media is transcribed, you can have the transcript
                automatically translated into another language using{" "}
                <ExternalLink href={"https://aws.amazon.com/translate/"}>
                  Amazon Translate
                </ExternalLink>{" "}
                and download it as subtitles, a document, or plain text.
                Translation is performed after transcription and requires
                additional processing time. Machine-generated translations
                should be reviewed before use.
              </Text>
            </Box>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                Summaries
              </Heading>
              <Text>
                Transcription summaries are generated by{" "}
                <ExternalLink href={"https://aws.amazon.com/bedrock/"}>
                  Amazon Bedrock
                </ExternalLink>
                using{" "}
                <ExternalLink href={"https://www.anthropic.com/claude/haiku"}>
                  Anthropic&apos;s Claude Haiku
                </ExternalLink>{" "}
                model. By using this service you are expected to comply with{" "}
                <ExternalLink href={"https://www.anthropic.com/legal/aup"}>
                  Anthropic&apos;s Usage Policy.
                </ExternalLink>
                Summaries are intended to provide an overview of the transcript
                and should not replace review of the source transcription. They
                may omit context or nuance from the original content.
              </Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root
        size={"sm"}
        variant={"outline"}
        css={styles.root}
        height={"100%"}
      >
        <Card.Header>
          <Card.Title asChild>
            <Heading as={"h2"} fontSize={"xl"}>
              Storage and security
            </Heading>
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align={"stretch"}>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                Data storage
              </Heading>
              Uploaded media, generated transcriptions, and generated
              translations are:
              <List.Root listStylePosition={"inside"}>
                <List.Item>
                  Stored in the Amazon Web Services (AWS) Sydney region
                </List.Item>
                <List.Item>
                  Kept for {formatDuration(TRANSCRIBE_QUOTAS.storageDuration)}{" "}
                  and then automatically deleted
                </List.Item>
                <List.Item>Encrypted in transit and at rest</List.Item>
                <List.Item>Only accessible by the uploader</List.Item>
              </List.Root>
              <Text mt={2}>
                For more information refer to the{" "}
                <ExternalLink
                  href={
                    "https://docs.aws.amazon.com/transcribe/latest/dg/security.html"
                  }
                >
                  Amazon Transcribe Security Documentation
                </ExternalLink>{" "}
                and the{" "}
                <ExternalLink
                  href={
                    "https://docs.aws.amazon.com/translate/latest/dg/security.html"
                  }
                >
                  Amazon Translate Security Documentation
                </ExternalLink>
                .
              </Text>
            </Box>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                PII redaction
              </Heading>
              <Text>
                Personally Identifiable Information (PII) is information that
                could identify someone, such as names, addresses, phone numbers,
                and credit card details. When PII redaction is turned on, any
                PII we detect is hidden in the transcription. This option is
                available for English (US) transcriptions.
              </Text>
            </Box>
            <Box>
              <Heading as={"h3"} fontSize={"md"} pb={1}>
                Summaries
              </Heading>
              Generated transcription summaries:
              <List.Root listStylePosition={"inside"}>
                <List.Item>
                  Do not use your prompts and completions to train any AWS
                  models, and are not distributed to third parties.
                </List.Item>
                <List.Item>
                  Use classifier metrics to identify potential violations of{" "}
                  <ExternalLink href={"https://aws.amazon.com/aup/"}>
                    Acceptable Use
                  </ExternalLink>{" "}
                  and{" "}
                  <ExternalLink
                    href={"https://aws.amazon.com/ai/responsible-ai/policy/"}
                  >
                    Responsible Use
                  </ExternalLink>{" "}
                  policies.
                </List.Item>
              </List.Root>
              <Text mt={2}>
                For more information refer to the{" "}
                <ExternalLink
                  href={
                    "https://docs.aws.amazon.com/bedrock/latest/userguide/security.html"
                  }
                >
                  Amazon Bedrock Security Documentation
                </ExternalLink>
                .
              </Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
      <Card.Root
        size={"sm"}
        variant={"outline"}
        css={styles.root}
        height={"100%"}
      >
        <Card.Header>
          <Card.Title asChild>
            <Heading as={"h2"} fontSize={"xl"}>
              Quotas and limits
            </Heading>
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap={4} align={"stretch"}>
            {limitSections.map(({ heading, limits }) => (
              <Box key={heading}>
                <Heading as={"h3"} fontSize={"md"} pb={1}>
                  {heading}
                </Heading>
                <Stack
                  gap={0}
                  borderTopWidth={1}
                  borderBottomWidth={1}
                  borderColor={{ base: "gray.200", _dark: "gray.600" }}
                  separator={
                    <StackSeparator
                      borderColor={{ base: "gray.200", _dark: "gray.600" }}
                    />
                  }
                >
                  {limits.map(({ label, value }) => (
                    <Stack key={label} direction={["column", "row"]} py={2}>
                      <Heading
                        as={"h4"}
                        size={"sm"}
                        minW={"12em"}
                        fontWeight={"normal"}
                      >
                        {label}
                      </Heading>
                      <Text>{value}</Text>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>
    </Grid>
  );
};

const LoginLayout: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const { authenticated } = useAuth();

  return (
    <Layout
      isLanding={true}
      isAuthenticated={authenticated}
      onLogin={handleLogin}
      onLogout={signOut}
    >
      {children}
    </Layout>
  );
};

Login.getLayout = (page) => {
  return <LoginLayout>{page}</LoginLayout>;
};

export default Login;
