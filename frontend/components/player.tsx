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
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { InputGroup } from "./ui/input-group";
import { Tooltip } from "./ui/tooltip";
import { MappedIcon } from "./mappedIcon";
import { useAnalytics } from "../context/analytics-context";
import {
  LanguageSpan,
  isMultilingual,
  languageCodeAt,
  languageName,
} from "./transcriptLanguages";

export interface PlayerProps {
  audio: string;
  transcript: string;
  preload?: boolean;
  query?: string;
  languages?: LanguageSpan[];
}

export interface TranscriptionProps {
  track?: TextTrack;
  seek: (seconds: number) => void;
  currentTime: number;
  query?: string;
  languages?: LanguageSpan[];
}

export const Transcription: FunctionComponent<TranscriptionProps> = ({
  track,
  seek,
  currentTime,
  query,
  languages,
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

  const languageSpans = languages ?? [];
  const showLanguages = isMultilingual(languageSpans);

  if (track?.cues !== null) {
    return (
      <Grid templateColumns="repeat(6, 1fr)" gap={2} mt={6}>
        {Array.from(Array(track?.cues.length).keys()).map((index) => {
          const cues = track?.cues as TextTrackCueList;
          const cue = cues[index] as TextTrackCue & { text: string };
          const isCurrent =
            currentTime >= cue.startTime && currentTime < cue.endTime;
          const languageCode = showLanguages
            ? languageCodeAt(languageSpans, cue.startTime)
            : undefined;

          return (
            <Fragment key={index}>
              <GridItem
                colSpan={2}
                onClick={() => handleSeek(cue.startTime)}
                cursor={"pointer"}
              >
                <Text
                  as={"span"}
                  textDecoration={isCurrent ? "underline" : undefined}
                >
                  {formatTime(cue.startTime)} - {formatTime(cue.endTime)}
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
              <GridItem
                colSpan={4}
                onClick={() => seek(cue.startTime)}
                cursor={"pointer"}
              >
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
          />
        )}
      </Box>
    </VStack>
  );
};

export default Player;
