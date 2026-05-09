from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any

# =========================================================================
# V1 SCHEMAS (Legacy - Used by current frontend)
# =========================================================================

class NoteEvent(BaseModel):
    pitch: int
    startTime: float
    duration: float
    amplitude: float
    confidence: float
    technique: str
    type: str
    label: Optional[str] = None
    stringIdx: Optional[Union[int, str]] = None
    fretIdx: Optional[int] = None
    capo: int = 0

class ColumnNote(BaseModel):
    stringIdx: Optional[Union[int, str]] = None
    fretIdx: Optional[int] = None
    isPerc: bool = False
    techLabel: str = ''
    tech: str = ''

class Column(BaseModel):
    id: float
    type: str = 'melody'
    notes: List[ColumnNote]

class Metadata(BaseModel):
    key: str
    scale: str
    bpm: int
    confidence: int
    capo: int = 0
    suggestedTuning: str
    grooveType: str
    swingRatio: float
    noteBreakdown: list = []
    percCount: int = 0
    techBreakdown: Dict[str, int] = {}

class TranscriptionResponse(BaseModel):
    notes: List[NoteEvent]
    metadata: Metadata
    columns: List[Column]

# =========================================================================
# V2 SCHEMAS (New Architecture)
# =========================================================================

class TuningCandidateV2(BaseModel):
    name: str
    confidence: float

class TuningInfoV2(BaseModel):
    selected: Optional[List[int]] = None
    candidates: List[TuningCandidateV2] = []
    analysis_status: str = "scaffolded"  # e.g., implemented | heuristic | scaffolded | fallback
    reason: Optional[str] = None

class KeyInfoV2(BaseModel):
    root: str
    scale: str
    confidence: float
    analysis_status: str = "implemented"

class MetadataV2(BaseModel):
    title: str = "Astra Transcription"
    duration: float = 0.0
    bpm: int
    time_signature: str = "4/4"
    key: KeyInfoV2
    capo: int = 0
    tuning: TuningInfoV2
    techniques_config: Dict[str, Any] = {}

class GrooveProfileV2(BaseModel):
    type: str
    swingRatio: float
    push_drag_tendency: float = 0.0
    analysis_status: str = "heuristic"

class ConfidenceSummaryV2(BaseModel):
    overall: float
    melodic: float
    percussive: float
    confidence_source: str = "normalized"  # raw_model | normalized | heuristic | fallback

class AnalysisV2(BaseModel):
    groove_profile: GrooveProfileV2
    chord_segments: List[Dict[str, Any]] = []
    confidence_summary: ConfidenceSummaryV2

class AlternativePositionV2(BaseModel):
    stringIdx: int
    fretIdx: int
    score: float

class NoteEventV2(BaseModel):
    pitch: int
    startTime: float
    duration: float
    amplitude: float
    raw_confidence: float     # Explicitly preserve model raw confidence
    normalized_confidence: float # Scaled confidence used for UI/ranking
    stringIdx: Optional[Union[int, str]] = None
    fretIdx: Optional[int] = None
    technique: str = 'pluck'
    label: Optional[str] = None
    technique_status: str = "heuristic" # Tracks if technique is real or proxy math
    alternative_positions: List[AlternativePositionV2] = []

class EventsV2(BaseModel):
    notes: List[NoteEventV2]
    techniques: List[Dict[str, Any]] = []
    percussion: List[Dict[str, Any]] = []

class LayeredTabV2(BaseModel):
    columns: List[Any] = []
    layers: Dict[str, List[Any]] = {"bass": [], "harmony": [], "melody": [], "percussion": []}

class TranscriptionResponseV2(BaseModel):
    transcription_version: str = "v2"
    metadata: MetadataV2
    analysis: AnalysisV2
    events: EventsV2
    tab: LayeredTabV2
