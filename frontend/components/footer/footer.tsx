import React, { Fragment, FunctionComponent } from "react";
import { Button, Flex, Link, Show, Spacer, VStack } from "@chakra-ui/react";
import { Text } from "@chakra-ui/layout";
import { EmailIcon, ExternalLinkIcon } from "@chakra-ui/icons";

const TeqsaLink: FunctionComponent = () => (
  <Link
    href={
      "https://www.teqsa.gov.au/national-register/provider/queensland-university-technology"
    }
    isExternal
  >
    PRV12079 <ExternalLinkIcon mb={1} />
  </Link>
);

export const Footer: FunctionComponent = () => {
  return (
    <Flex direction={["column", "column", "row"]}>
      <VStack alignItems={"start"} spacing={0}>
        <Text noOfLines={1}>Developed by the Office of eResearch, QUT</Text>
        <Link href={"https://www.qut.edu.au/about/indigenous"} isExternal>
          QUT acknowledges the Traditional Owners of the lands where QUT now
          stands.
          <ExternalLinkIcon mb={1} />
        </Link>
        <Fragment>
          <Show below={"md"}>
            <Text>
              TEQSA <TeqsaLink /> | CRICOS No. 00213J
            </Text>
          </Show>
          <Show above={"md"}>
            <Text>
              TEQSA Provider ID <TeqsaLink />
              Australian University | CRICOS No. 00213J
            </Text>
          </Show>
        </Fragment>
      </VStack>
      <Spacer />
      <Link href={"mailto:eresearch@qut.edu.au"} isExternal>
        <Button
          colorScheme={"blue"}
          variant={"solid"}
          leftIcon={<EmailIcon />}
          rightIcon={<ExternalLinkIcon />}
        >
          Contact eResearch
        </Button>
      </Link>
    </Flex>
  );
};

export default Footer;
