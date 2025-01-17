import { Link, LinkProps } from "@chakra-ui/react";
import React from "react";

interface ExternalLinkProps extends LinkProps {
  href: string;
  children: React.ReactNode;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({
  href,
  children,
  ...rest
}) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color={{ base: "blue.600", _dark: "white" }}
      {...rest}
    >
      {children}
    </Link>
  );
};

export default ExternalLink;
