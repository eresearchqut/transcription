import { Link, LinkProps } from "@chakra-ui/react";
import React from "react";
import { MappedIcon } from "@/components/mappedIcon";

interface ExternalLinkProps extends LinkProps {
  href: string;
  withIcon?: boolean;
  children: React.ReactNode;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({
  href,
  withIcon = true,
  children,
  ...rest
}) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      display={"inline"}
      color={{ base: "blue.600", _dark: "white" }}
      textDecoration={"underline"}
      textDecorationColor={{ base: "blue.200", _dark: "whiteAlpha.400" }}
      _hover={{ textDecorationColor: "currentColor" }}
      {...rest}
    >
      {children}{" "}
      {withIcon && (
        <MappedIcon icon={"external-link"} mb={1} display={"inline"} />
      )}
    </Link>
  );
};

export default ExternalLink;
