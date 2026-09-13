import { Box, Button, type DrawerRootProps } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import * as React from "react";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "@/components/ui/accordion";
import Player from "../player";
import { Alert } from "../ui/alert";
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerRoot,
} from "../ui/drawer";

export interface MediaPlayerDrawerProps
  extends Omit<DrawerRootProps, "children"> {
  mediaUrl: string;
  transcriptUrl: string;
  summary?: string;
  languages?: (string | undefined)[];
  speakers?: string[];
}

const WithMediaPlayerLayout: FunctionComponent<MediaPlayerDrawerProps> = ({
  mediaUrl,
  transcriptUrl,
  summary,
  languages,
  speakers,
  open,
  onOpenChange,
  ...drawerProps
}) => {
  const finalRef = React.useRef(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Chrome's native audio controls expand to fill the element as part of their
  // own entry animation. Mounting the player while the drawer is still sliding
  // in strands that expansion partway, leaving the controls narrower than the
  // element until something forces a relayout, such as pressing play. Waiting
  // for the drawer's animations to finish avoids the overlap.
  const [drawerSettled, setDrawerSettled] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDrawerSettled(false);
      return;
    }

    let cancelled = false;
    // The animations do not exist until styles are recalculated, which happens
    // after this effect runs.
    const frame = requestAnimationFrame(() => {
      const content = contentRef.current;
      if (!content) {
        setDrawerSettled(true);
        return;
      }
      Promise.all(
        content
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ).then(() => {
        if (!cancelled) setDrawerSettled(true);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open]);

  return (
    <DrawerRoot
      placement="end"
      finalFocusEl={() => finalRef.current}
      size={"lg"}
      open={open}
      onOpenChange={onOpenChange}
      {...drawerProps}
    >
      <DrawerBackdrop />
      <DrawerContent ref={contentRef}>
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
          {mediaUrl && transcriptUrl && drawerSettled && (
            <Box flex="1" minH={0} display="flex" flexDirection="column">
              <Player
                audio={mediaUrl}
                transcript={transcriptUrl}
                languages={languages}
                speakers={speakers}
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
