import React from "react";

export const DialogueSegment = (props) => {
  return (
    <React.Fragment>
      <p>
        <b>{props.mainSpeaker}: </b> {props.startTime} - {props.endTime}
      </p>
      <p>{props.children}</p>
    </React.Fragment>
  );
};
