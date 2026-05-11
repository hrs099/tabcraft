# Wireframe Plan: Tabvision

## 1. Landing / Home Screen
- **Header:** Logo "Tabvision", Navigation (Home, My Projects, Settings)
- **Hero Section:** Headline ("Convert Guitar Video to Tab & Practice"), Subheadline, Primary CTA ("Upload Video").
- **Features Overview:** Sync, Percussion Markers, Practice Mode, Correction Editor.

## 2. Upload / Input Setup
- **Upload Area:** Drag & Drop area for video/audio file.
- **Config Form:**
  - Guitar Tuning (Standard, Drop D, DADGAD, etc.)
  - Capo Position (None, Fret 1-12)
  - Transcription Mode (Solo Fingerstyle, Strumming, Percussive)
- **Submit Button:** "Start Analysis"

## 3. Analysis Progress
- **Progress Bar:** Overall progress (0-100%)
- **Status Log:** Step-by-step indicators:
  - Audio/Video Separation...
  - Note & Pitch Detection...
  - Fretboard Mapping...
  - Percussion Event Detection...
  - Tablature Generation...

## 4. Main Result Workspace
- **Top Toolbar:** File Info, Tuning/Capo Display, Export, Settings, Modes (Workspace, Correction, Practice).
- **Video Player (Top Left):** Synced video playback, play/pause, timeline.
- **2D Fretboard (Top Right):** Live representation of fingers/notes on the fretboard.
- **Tablature & Notation Lane (Bottom Half):**
  - Standard notation staff.
  - Tablature staff with percussion markers (e.g., 'X' for slap, 'T' for tap).
  - Confidence colors (Green = High, Yellow = Medium, Red = Low).
  - Playhead syncing with video.

## 5. Note Correction Editor
- **Workspace Overlay:** Clicking a note/bar opens the editor.
- **Tools:**
  - Change pitch / string / fret.
  - Change timing / duration.
  - Edit technique (Hammer-on, Pull-off, Slide).
  - Add/Remove percussion markers.
- **Alternate Suggestions:** "Did you mean: Fret 3 on A string?"
- **Actions:** Save, Cancel, Re-analyze Bar.

## 6. Practice Mode
- **Simplified UI:** Hide complex editors.
- **Controls:**
  - Loop Start/End selectors.
  - Playback Speed (0.5x, 0.75x, 1x).
  - Metronome Toggle.
  - Speed Trainer (Auto-increment speed).
- **Focus Mode:** Highlights only the current bar, fades out the rest.

## 7. Intelligence & Settings Panel
- **Slide-out Sidebar:**
  - Chord & Scale summaries for the song.
  - Tuning & Capo adjustments.
  - Display options (Hide/Show notation, change color theme).
  - Export options (PDF, MusicXML, Guitar Pro).
