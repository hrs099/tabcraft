# Testing Plan

## Test folders
- clean-solo-fingerstyle
- percussive-fingerstyle-basic
- noisy-audio
- alternate-tuning
- capo
- live-recording
- harmonic-plus-percussion

## Test pack structure
Each test video should include:
- source file
- short description
- expected techniques
- expected tuning and capo info
- expected hard sections
- expected percussion-marked passages when present

## Evaluation metrics
- Note accuracy.
- String/fret accuracy.
- Technique accuracy.
- Timing usability.
- Tuning accuracy.
- Capo accuracy.
- Basic percussion marker usefulness.
- Correction time per bar.
- User trust score from confidence display.

## Test stages
- UI sync testing.
- Mock data workflow testing.
- Correction workflow testing.
- Practice workflow testing.
- Real model output testing.

## Failure buckets
- Wrong pitch.
- Wrong string/fret.
- Wrong timing.
- Missed technique.
- False technique.
- Missed percussion marker.
- False percussion marker.
- Tuning mismatch.
- Capo mismatch.
- Video occlusion.
- Noise masking.
