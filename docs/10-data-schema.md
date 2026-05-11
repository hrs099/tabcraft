# Data Schema

## Project
- id
- title
- createdAt
- updatedAt
- mode
- status
- sourceType

## Video
- id
- fileName
- duration
- fps
- width
- height
- audioTrack
- thumbnail

## Bar
- id
- index
- startTime
- endTime
- timeSignature
- confidence

## Beat
- id
- barId
- index
- startTime
- endTime

## Note
- id
- startTime
- endTime
- pitch
- string
- fret
- bar
- beat
- confidence
- techniqueTags
- leftHandFinger
- rightHandFinger
- velocity
- sourceConfidenceAudio
- sourceConfidenceVideo
- sourceConfidenceFused

## TechniqueEvent
- id
- type
- startTime
- endTime
- confidence
- source

## PercussionEvent
- id
- type
- startTime
- endTime
- confidence
- labelMode
- linkedBar
- linkedBeat

## Correction
- id
- targetType
- targetId
- oldValue
- newValue
- reason
- createdAt

## TuningProfile
- id
- stringCount
- strings
- name
- confidence

## CapoProfile
- id
- fret
- type
- confidence

## SuggestionVariant
- id
- barId
- rank
- notes
- percussionEvents
- confidence
- explanation
