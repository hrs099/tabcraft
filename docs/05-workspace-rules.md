# Workspace Rules

## Layout
- Left: video player.
- Center: tablature and notation in one main lane.
- Right: live fretboard and technique summary.
- Bottom: waveform, bar timeline, confidence strip, loop handles, percussion markers.

## Must stay visible
- Playhead.
- Current bar.
- Current note highlight.
- Loop region.
- Confidence layer.
- Video sync state.
- Percussion markers when present.

## Interaction rules
- Clicking any note jumps playback to exact time.
- Scrubbing waveform updates video, tab cursor, and fretboard together.
- Dragging over notes or timeline creates loop.
- Hover note shows pitch, string, fret, technique, confidence.
- Clicking uncertain bar opens alternate suggestions.
- Clicking a percussion marker jumps to that event time.

## Visual rules
- Confidence is a first-class layer.
- User edits must look visually different from AI output.
- Low-confidence filter must be fast to use.
- Percussion markers must be visible but not overpower note readability.
- Default workspace should feel dense but readable.

## Percussion rules in V1
- Show basic percussion markers only.
- Keep percussion labels on the main lane and timeline.
- Mark percussion inference as experimental when confidence is low.
- Do not force full percussion classification when the model is unsure.

## Fail-safe rules
- If notation is not available, show tab-first mode.
- If video confidence is low, keep playback sync but warn user.
- If tuning or capo is uncertain, mark it clearly near toolbar and note lanes.
