import * as React from "react";
import { FunctionComponent } from "react";
import { Box, Button, DrawerRootProps } from "@chakra-ui/react";
import Player from "../player";
import type { LanguageSpan } from "../transcriptLanguages";
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerRoot,
} from "../ui/drawer";
import { Alert } from "../ui/alert";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "@/components/ui/accordion";

export interface MediaPlayerDrawerProps
  extends Omit<DrawerRootProps, "children"> {
  mediaUrl: string;
  transcriptUrl: string;
  summary?: string;
  languages?: LanguageSpan[];
}

const WithMediaPlayerLayout: FunctionComponent<MediaPlayerDrawerProps> = ({
  mediaUrl,
  transcriptUrl,
  summary,
  languages,
  open,
  onOpenChange,
  ...drawerProps
}) => {
  const finalRef = React.useRef(null);

  return (
    <DrawerRoot
      placement="end"
      finalFocusEl={() => finalRef.current}
      size={"md"}
      open={open}
      onOpenChange={onOpenChange}
      {...drawerProps}
    >
      <DrawerBackdrop />
      <DrawerContent>
        <Alert status="info" title={"Web Player"}>
          <Box>
            Scroll to any point in the transcript and click the dialogue to hear
            the associated audio.
          </Box>
        </Alert>

        <DrawerBody display="flex" flexDirection="column" overflow="hidden">
          {summary && (
            <AccordionRoot
              collapsible
              variant={"enclosed"}
              mb={4}
              flexShrink={0}
            >
              <AccordionItem value={"summary"}>
                <AccordionItemTrigger>
                  Summary of transcript
                </AccordionItemTrigger>
                <AccordionItemContent>{summary}</AccordionItemContent>
              </AccordionItem>
            </AccordionRoot>
          )}
          {mediaUrl && transcriptUrl && (
            <Box flex="1" minH={0} display="flex" flexDirection="column">
              <Player
                audio={mediaUrl}
                transcript={transcriptUrl}
                languages={languages}
              />
            </Box>
          )}
        </DrawerBody>

        <DrawerFooter>
          <Button
            variant="outline"
            mr={3}
            data-umami-event={"close-player"}
            onClick={() => {
              onOpenChange?.({ open: false });
            }}
          >
            Close player
          </Button>
        </DrawerFooter>
        <DrawerCloseTrigger />
      </DrawerContent>
    </DrawerRoot>
  );
};

export default WithMediaPlayerLayout;
