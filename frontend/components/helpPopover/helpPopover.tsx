import { FunctionComponent } from "react";
import {
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
} from "@chakra-ui/react";
import { QuestionIcon } from "@chakra-ui/icons";

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
    <Popover>
      <PopoverTrigger>
        <IconButton
          aria-label={ariaLabel}
          icon={<QuestionIcon />}
          isRound={true}
          size={"xxs"}
          cursor={"pointer"}
          color={"brand.500"}
        />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader>{header}</PopoverHeader>
        <PopoverBody>{children}</PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default HelpPopover;
