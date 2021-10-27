import React, { useEffect, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { ListBox } from "primereact/listbox";

export const ScriptSegment = (props) => {
  const [showDialog, setShowDialog] = useState(false);
  const contentEditable = useRef(null);

  useEffect(() => {
    if (props.isCurrent) {
      contentEditable.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  });

  const alternativesLength = props.segment.alternatives.length - 1;
  const alternativesText =
    alternativesLength === 1 ? "alternative" : "alternatives";

  return (
    <div style={{ color: props.isCurrent ? "#000" : "#5a5a5a" }}>
      <h5 style={{ margin: "10px 0 0 0" }}>
        <Button
          className="p-button-text  p-button-plain"
          onClick={() => props.setTime(props.segment.startTime)}
        >
          <b>{props.segment.mainSpeaker}: </b> {props.segment.timestamp}
        </Button>
        <Button
          className="p-button-text p-button-info"
          onClick={() => setShowDialog(true)}
        >
          {alternativesLength} {alternativesText}
        </Button>
        <Dialog
          visible={showDialog}
          onHide={() => setShowDialog(false)}
          header="Alternatives"
          dismissableMask={true}
        >
          <p>{props.segment.transcript}</p>
          <ListBox
            value={props.segment.transcript}
            onChange={(e) => {
              props.setTranscript(props.index, e.value.transcript);
              setShowDialog(false);
            }}
            options={props.segment.alternatives.map((e, i) => {
              return {
                transcript: e.transcript,
                code: i,
              };
            })}
            optionLabel="transcript"
            listStyle={{ maxHeight: "400px" }}
            appendTo={document.querySelector("button")}
          />
        </Dialog>
      </h5>
      <ContentEditable
        innerRef={contentEditable}
        html={props.segment.transcript}
        onChange={(e) => props.setTranscript(props.index, e.target.value)}
      />
    </div>
  );
};
