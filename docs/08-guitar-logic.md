# Guitar Logic

## Why guitar logic matters
One pitch can exist on multiple strings and fret positions. Audio alone may know the pitch but not the physical position.

## Why percussive fingerstyle changes the problem
This style combines pitched notes, bass movement, harmonics, and body-hit rhythm inside the same passage. The system must preserve musical timing while still showing playable fretboard mapping.

## Core mapping rules
- Tuning changes open-string pitch reference.
- Capo changes visible and effective fret offset.
- Position optimization changes where the same note should be placed.
- Video can help choose the most likely string and fret.
- Percussion markers should align to the same timeline as notes, even when they are not fully classified.

## Position modes
### Easiest
Prefer low-complexity fingering.

### Closest position
Minimize hand movement.

### Original position
Prefer the likely performed position from video evidence.

## Tuning rules
- Standard tuning is default.
- Custom tuning must be supported.
- Tuning uncertainty must be shown as a warning.

## Capo rules
- Capo affects naming, fret offset, and playability mapping.
- Capo state should be editable even if auto-detection exists.

## Fused inference
Use audio confidence, video confidence, and guitar rules together instead of relying on only one source.

## V1 percussion rule
V1 should support basic percussion markers without pretending to fully understand every body-hit type or hand source.
