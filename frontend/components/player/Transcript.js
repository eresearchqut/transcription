import React from 'react'
import PropTypes from 'prop-types'
import TranscriptLine from './TranscriptLine'
import './Track.css'

class Transcript extends React.Component {

  render() {
    const lines = []
    if (this.props.track && this.props.track.cues) {
      for (let i = 0; i < this.props.track.cues.length; i++) {
        lines.push(
          <TranscriptLine
            key={`line-${i}`}
            cue={this.props.track.cues[i]} 
            active={false} 
            seek={this.props.seek} 
            query={this.props.query} />
        )
      }
    }
    return (
      <div className="track">
        {lines}
      </div>
    )
  }

}

Transcript.propTypes = {
  track: PropTypes.object,
  url: PropTypes.string,
  seek: PropTypes.func,
  query: PropTypes.string
}

export default Transcript
