import React, { FunctionComponent } from "react";
import { IconButton } from "@chakra-ui/react";
import { MappedIcon } from "../mappedIcon";
import {
  PopoverArrow,
  PopoverBody,
  PopoverCloseTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface HelpPopoverProps {
  ariaLabel: string;
  header: string;
  children: React.ReactNode;
}

export const HelpPopover: FunctionComponent<HelpPopoverProps> = ({
  ariaLabel,
  header,
  children,
}) => {
  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <IconButton
          aria-label={ariaLabel}
          rounded={"full"}
          cursor={"pointer"}
          colorPalette={"blue"}
          size={"2xs"}
        >
          <MappedIcon icon={"question"} asIcon={false} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>{header}</PopoverHeader>
        <PopoverArrow />
        <PopoverBody>{children}</PopoverBody>
        <PopoverCloseTrigger />
      </PopoverContent>
    </PopoverRoot>
  );
};

export default HelpPopover;
