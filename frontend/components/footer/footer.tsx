import React, { Fragment, FunctionComponent } from "react";
import { Button, Flex, Spacer, Text, VStack } from "@chakra-ui/react";
import { ExternalLink } from "../externalLink";
import { MappedIcon } from "../mappedIcon";

const TeqsaLink: FunctionComponent = () => (
  <ExternalLink
    href={
      "https://www.teqsa.gov.au/national-register/provider/queensland-university-technology"
    }
  >
    PRV12079
  </ExternalLink>
);

export const Footer: FunctionComponent = () => {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      alignItems={{ base: "stretch", md: "center" }}
      gap={4}
      className="dark"
    >
      <VStack alignItems={"start"} gap={0}>
        <Text lineClamp={1}>Developed by the Office of eResearch, QUT</Text>
        <ExternalLink
          href={"https://www.qut.edu.au/about/indigenous"}
          color={"white"}
        >
          QUT acknowledges the Traditional Owners of the lands where QUT now
          stands.
        </ExternalLink>
        <Fragment>
          <Text hideFrom={"md"}>
            TEQSA <TeqsaLink /> | CRICOS No. 00213J
          </Text>
          <Text hideBelow={"md"}>
            TEQSA Provider ID <TeqsaLink /> Australian University | CRICOS No.
            00213J
          </Text>
        </Fragment>
      </VStack>
      <Spacer display={{ base: "none", md: "block" }} />
      <ExternalLink
        href={
          "https://qutvirtual4.qut.edu.au/group/research-students/conducting-research/specialty-research-facilities/advanced-research-computing-storage"
        }
        withIcon={false}
        display={{ base: "block", md: "inline" }}
      >
        <Button
          colorPalette={"blue"}
          variant={"solid"}
          width={{ base: "full", md: "auto" }}
          data-umami-event={"contact-eresearch"}
        >
          Contact eResearch{" "}
          <MappedIcon icon={"external-link"} width={"1em"} height={"1em"} />
        </Button>
      </ExternalLink>
    </Flex>
  );
};

export default Footer;
