# Component List: Tabvision

## App & Layout
- `App`
- `Layout`
- `Header`
- `Sidebar` (for Settings/Intelligence)

## Common / Shared
- `Button`
- `ProgressBar`
- `Tooltip`
- `Modal`
- `Toggle`
- `SelectDropdown`
- `Slider`

## Video & Fretboard
- `VideoPlayer`: Custom wrapper around HTML5 video for precise syncing.
- `FretboardReplay`: 2D canvas or SVG based interactive fretboard.
- `Timeline`: Scrubber bar linking video and tab playheads.

## Tablature & Notation
- `TabWorkspace`: Main container for notation and tabs.
- `NotationStaff`: Renders standard music notation.
- `TabStaff`: Renders guitar tablature.
- `NoteRenderer`: Individual note element (handles confidence colors and selection).
- `PercussionMarker`: Renders percussive events on the timeline.

## Editors & Workflows
- `CorrectionEditor`: Popup/Panel for editing a selected note.
- `SuggestionList`: Renders AI alternate suggestions.
- `PracticeControls`: Toolbar for looping, slowdown, and metronome.
- `SpeedTrainer`: UI for progressive speed increases.

## Screens
- `LandingScreen`
- `UploadScreen`
- `AnalysisScreen`
- `WorkspaceScreen` (combines Video, Fretboard, TabWorkspace)
- `PracticeScreen`
