import * as React from "react";
import { FunctionComponent } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerOverlay,
  DrawerProps,
} from "@chakra-ui/react";
import { Box } from "@chakra-ui/layout";
import Player from "../player";

export interface MediaPlayerDrawerProps extends Omit<DrawerProps, "children"> {
  mediaUrl: string;
  transcriptUrl: string;
}

const WithMediaPlayerLayout: FunctionComponent<MediaPlayerDrawerProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  transcriptUrl,
}) => {
  const finalRef = React.useRef(null);

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      finalFocusRef={finalRef}
      size={"md"}
    >
      <DrawerOverlay />
      <DrawerContent>
        <Alert status="info">
          <AlertIcon />
          <Box>
            <AlertTitle>Web Player</AlertTitle>
            <AlertDescription>
              Scroll to any point in the transcript and click the dialogue to
              hear the associated audio.
            </AlertDescription>
          </Box>
        </Alert>

        <DrawerBody>
          {mediaUrl && transcriptUrl && (
            <Player audio={mediaUrl} transcript={transcriptUrl} />
          )}
        </DrawerBody>

        <DrawerFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            Close player
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default WithMediaPlayerLayout;
