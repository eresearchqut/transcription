import React, {
  Fragment,
  FunctionComponent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Badge,
  Box,
  Grid,
  GridItem,
  Highlight,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { InputGroup } from "./ui/input-group";
import { Switch } from "./ui/switch";
import { Tooltip } from "./ui/tooltip";
import { MappedIcon } from "./mappedIcon";
import { useAnalytics } from "../context/analytics-context";
import { isMultilingual, languageName } from "./transcriptLanguages";

export interface PlayerProps {
  audio: string;
  transcript: string;
  preload?: boolean;
  query?: string;
  languages?: (string | undefined)[];
  speakers?: string[];
}

export interface TranscriptionProps {
  track?: TextTrack;
  seek: (seconds: number) => void;
  currentTime: number;
  query?: string;
  languages?: (string | undefined)[];
  speakers?: string[];
  showSpeakers?: boolean;
  showLanguages?: boolean;
}

export const Transcription: FunctionComponent<TranscriptionProps> = ({
  track,
  seek,
  currentTime,
  query,
  languages,
  speakers,
  showSpeakers = false,
  showLanguages = false,
}) => {
  const formatTime = (t: number): string => {
    let minutes: string | number = Math.floor(t / 60);
    if (minutes < 10) {
      minutes = `0${minutes}`;
    }
    let seconds: string | number = Math.floor(t % 60);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    return `${minutes}:${seconds}`;
  };

  const { track: trackEvent } = useAnalytics();

  const handleSeek = (seconds: number) => {
    trackEvent("track-seek", {
      seconds,
    });
    seek(seconds);
  };

  const languageCodes = languages ?? [];
  const speakerLabels = speakers ?? [];

  if (track?.cues) {
    const speakerColumn = showSpeakers && speakerLabels.some(Boolean);
    return (
      <Grid
        templateColumns={
          speakerColumn ? "max-content max-content 1fr" : "max-content 1fr"
        }
        gap={2}
        mt={6}
      >
        {Array.from(Array(track?.cues.length).keys()).map((index) => {
          const cues = track?.cues as TextTrackCueList;
          const cue = cues[index] as TextTrackCue & { text: string };
          const isCurrent =
            currentTime >= cue.startTime && currentTime < cue.endTime;
          const languageCode = showLanguages ? languageCodes[index] : undefined;
          const speaker = speakerLabels[index];

          return (
            <Fragment key={index}>
              <GridItem
                onClick={() => handleSeek(cue.startTime)}
                cursor={"pointer"}
                display={"flex"}
                alignItems={"flex-start"}
                whiteSpace={"nowrap"}
                fontFamily={"mono"}
              >
                <Text
                  as={"span"}
                  textDecoration={isCurrent ? "underline" : undefined}
                >
                  {formatTime(cue.startTime)}-{formatTime(cue.endTime)}
                </Text>
                {languageCode && (
                  <Tooltip content={languageName(languageCode)} portalled>
                    <Badge
                      ml={2}
                      size={"sm"}
                      variant={"surface"}
                      colorPalette={"blue"}
                      minW={"max-content"}
                    >
                      {languageCode.toUpperCase()}
                    </Badge>
                  </Tooltip>
                )}
              </GridItem>
              {speakerColumn && (
                <GridItem
                  onClick={() => seek(cue.startTime)}
                  cursor={"pointer"}
                  whiteSpace={"nowrap"}
                  fontWeight={"medium"}
                >
                  <Text as={"span"}>{speaker}</Text>
                </GridItem>
              )}
              <GridItem onClick={() => seek(cue.startTime)} cursor={"pointer"}>
                {query && (
                  <Text as={isCurrent ? "u" : undefined}>
                    <Highlight
                      query={query.split(" ")}
                      styles={{ bg: "blue.100" }}
                    >
                      {cue.text}
                    </Highlight>
                  </Text>
                )}
                {!query && (
                  <Text as={isCurrent ? "u" : undefined}>{cue.text}</Text>
                )}
              </GridItem>
            </Fragment>
          );
        })}
      </Grid>
    );
  }

  return null;
};

export const Player: FunctionComponent<PlayerProps> = (props) => {
  const [transcriptLoaded, setTranscriptLoaded] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [tries, setTries] = useState<number>(0);
  const [query, setQuery] = useState<string>(props.query || "");
  const hasSpeakers = (props.speakers ?? []).some(Boolean);
  const multilingual = isMultilingual(props.languages ?? []);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [showLanguages, setShowLanguages] = useState(true);
  const audio = useRef<HTMLAudioElement>(null);
  const track = useRef<HTMLTrackElement>(null);

  const seek = (seconds: number) => {
    if (audio.current) {
      audio.current.currentTime = seconds;
      audio.current?.play().then();
    }
  };

  useEffect(() => {
    if (
      track &&
      track.current &&
      track.current.track.cues &&
      track.current.track.cues.length > 0
    ) {
      setTranscriptLoaded(true);
    } else {
      const wait = 25 * Math.pow(tries, 2);
      setTimeout(() => setTries((current: number) => current + 1), wait, tries);
    }
  }, [tries]);

  return (
    <VStack align="stretch" gap={2} h="100%" minH={0}>
      <audio
        style={{ width: "100%", flexShrink: 0 }}
        controls
        crossOrigin="anonymous"
        preload={`${props.preload}`}
        onTimeUpdate={() => setCurrentTime(audio.current?.currentTime || 0)}
        ref={audio}
      >
        <source src={props.audio} />
        <track default kind="subtitles" src={props.transcript} ref={track} />
      </audio>

      {(hasSpeakers || multilingual) && (
        <HStack gap={6} flexShrink={0}>
          {hasSpeakers && (
            <Switch
              checked={showSpeakers}
              onCheckedChange={(e) => setShowSpeakers(e.checked)}
              size={"sm"}
            >
              Show speaker label
            </Switch>
          )}
          {multilingual && (
            <Switch
              checked={showLanguages}
              onCheckedChange={(e) => setShowLanguages(e.checked)}
              size={"sm"}
            >
              Show language label
            </Switch>
          )}
        </HStack>
      )}

      <InputGroup
        mt={2}
        flexShrink={0}
        startElement={<MappedIcon icon={"search"} color={"gray.300"} />}
      >
        <Input
          value={query}
          placeholder="Search"
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>
      <Box flex="1" minH={0} overflowY="auto">
        {transcriptLoaded && (
          <Transcription
            track={track.current?.track}
            seek={seek}
            query={query}
            currentTime={currentTime}
            languages={props.languages}
            speakers={props.speakers}
            showSpeakers={showSpeakers}
            showLanguages={showLanguages}
          />
        )}
      </Box>
    </VStack>
  );
};

export default Player;
