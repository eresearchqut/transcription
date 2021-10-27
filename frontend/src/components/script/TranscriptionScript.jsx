import { React, useRef, useState } from "react";

import { ScriptSegment } from "./ScriptSegment";

export const TranscriptionScript = (props) => {
  const [currentTime, setCurrentTime] = useState(0);
  const audioElement = useRef(null);

  const setTime = (time) => {
    audioElement.current.currentTime = time;
    audioElement.current.play();
  };

  const dialogueSegments = props.scriptSegments.map((segment, index) => {
    return (
      <ScriptSegment
        key={index}
        index={index}
        isCurrent={
          currentTime > segment.startTime && currentTime < segment.endTime
        }
        segment={segment}
        setTranscript={props.setTranscript}
        setTime={setTime}
      />
    );
  });

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: "#fff",
          zIndex: 1,
        }}
      >
        <audio
          ref={audioElement}
          controls
          src={props.mediaUrl}
          onTimeUpdate={(event) => setCurrentTime(event.target.currentTime)}
          style={{ width: "100%" }}
        />
      </div>
      {dialogueSegments}
    </div>
  );
};
