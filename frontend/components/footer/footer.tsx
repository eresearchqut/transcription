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
    PRV12079 <MappedIcon icon={"external-link"} mb={1} />
  </ExternalLink>
);

export const Footer: FunctionComponent = () => {
  return (
    <Flex
      direction={["column", "column", "row"]}
      alignItems="center"
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
          <MappedIcon icon={"external-link"} mb={1} />
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
      <Spacer />
      <ExternalLink
        href={
          "https://qutvirtual4.qut.edu.au/group/research-students/conducting-research/specialty-research-facilities/advanced-research-computing-storage"
        }
      >
        <Button colorPalette={"blue"} variant={"solid"}>
          Contact eResearch <MappedIcon icon={"external-link"} mb={1} />
        </Button>
      </ExternalLink>
    </Flex>
  );
};

export default Footer;
