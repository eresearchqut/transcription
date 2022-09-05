import React, { Fragment, FunctionComponent, useEffect, useRef, useState } from "react";

import { Input, InputGroup, InputLeftElement } from "@chakra-ui/input";
import { SearchIcon } from "@chakra-ui/icons";
import { Grid, GridItem, Highlight, Text } from "@chakra-ui/react";

export interface PlayerProps {
  audio: string,
  transcript: string,
  preload?: boolean,
  query?: string
}

export interface TranscriptionProps {
  track?: TextTrack;
  seek: (seconds: number) => void;
  query?: string;
}

export const Transcription: FunctionComponent<TranscriptionProps> = ({ track, seek, query }) => {

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

  if (track?.cues !== null) {
    return <Grid templateColumns="repeat(6, 1fr)" gap={2} mt={6}>
      {Array.from(Array(track?.cues.length).keys())
        .map((index) => {
          const cues = track?.cues as TextTrackCueList;
          const cue = cues[index] as TextTrackCue & { text: string };
          const match = !query || cue.text.match(new RegExp(query, "i"));
          if (match) {
            return <Fragment key={index}>
              <GridItem colSpan={2}>{formatTime(cue.startTime)} - {formatTime(cue.endTime)}</GridItem>
              <GridItem colSpan={4} onClick={() => seek(cue.startTime)} cursor={"pointer"}>
                {query &&
                  <Highlight query={query.split(" ")}
                             styles={{ bg: "blue.100" }}>{cue.text}</Highlight>
                }
                {!query && <Text>{cue.text}</Text>}
              </GridItem>
            </Fragment>;
          }
          return null;
        })}
    </Grid>;
  }

  return null;
};

export const Player: FunctionComponent<PlayerProps> = (props) => {

  const [transcriptLoaded, setTranscriptLoaded] = useState<boolean>(false);
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

    if (track && track.current && track.current.track.cues && track.current.track.cues.length > 0) {
      setTranscriptLoaded(true);
    } else {
      const wait = 25 * Math.pow(tries, 2);
      setTimeout(() => setTries((current: number) => current + 1), wait, tries);
    }

  }, [tries]);


  return (
    <>
      <audio
        style={{ width: "100%" }}
        controls
        crossOrigin="anonymous"
        preload={`${props.preload}`}
        ref={audio}>
        <source src={props.audio} />
        <track default
               kind="subtitles"
               src={props.transcript}
               ref={track} />
      </audio>

      <InputGroup mt={2}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.300" />
        </InputLeftElement>
        <Input value={query} placeholder="Search" onChange={(e) => setQuery(e.target.value)} />
      </InputGroup>
      {transcriptLoaded &&
        <Transcription track={track.current?.track} seek={seek} query={query} />
      }

    </>
  );
};


export default Player;