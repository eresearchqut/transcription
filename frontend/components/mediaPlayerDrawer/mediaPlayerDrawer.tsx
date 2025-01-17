import * as React from "react";
import { FunctionComponent } from "react";
import { Box, Button, DrawerRootProps } from "@chakra-ui/react";
import Player from "../player";
import {
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerRoot,
} from "../ui/drawer";
import { Alert } from "../ui/alert";

export interface MediaPlayerDrawerProps
  extends Omit<DrawerRootProps, "children"> {
  mediaUrl: string;
  transcriptUrl: string;
}

const WithMediaPlayerLayout: FunctionComponent<MediaPlayerDrawerProps> = ({
  mediaUrl,
  transcriptUrl,
  open,
  onOpenChange,
  ...drawerProps
}) => {
  const finalRef = React.useRef(null);

  return (
    <DrawerRoot
      placement="end"
      finalFocusRef={finalRef}
      size={"md"}
      open={open}
      onOpenChange={onOpenChange}
      {...drawerProps}
    >
      <DrawerContent>
        <Alert status="info" title={"Web Player"}>
          <Box>
            Scroll to any point in the transcript and click the dialogue to hear
            the associated audio.
          </Box>
        </Alert>

        <DrawerBody>
          {mediaUrl && transcriptUrl && (
            <Player audio={mediaUrl} transcript={transcriptUrl} />
          )}
        </DrawerBody>

        <DrawerFooter>
          <Button
            variant="outline"
            mr={3}
            onClick={() => {
              onOpenChange({ open: false });
            }}
          >
            Close player
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </DrawerRoot>
  );
};

export default WithMediaPlayerLayout;
