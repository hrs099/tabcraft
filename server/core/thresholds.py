from pydantic import BaseModel, Field

class PitchThresholds(BaseModel):
    """
    Thresholds for pitch extraction.
    Currently used in pitch.py using librosa pYIN.
    """
    onset_threshold: float = Field(0.5, description="Threshold for considering a frame an onset.")
    frame_threshold: float = Field(0.3, description="Threshold for considering a frame a continuing pitch.")
    min_freq_hz: float = Field(73.42, description="Lowest expected frequency (e.g., Drop D is ~73.4Hz).")
    min_note_len_ms: float = Field(50.0, description="Minimum length of a valid note event in ms.")

class MapperThresholds(BaseModel):
    """
    Thresholds for Viterbi fretboard mapping.
    """
    max_fret_stretch: int = Field(5, description="Maximum playable fret span for a single hand position without barre.")
    max_hard_stretch: int = Field(7, description="Absolute span cap before rejecting state (accounting for open strings or heroic voicings).")
    
    position_shift_penalty: float = Field(3.0, description="Cost multiplier for moving hand anchor position.")
    open_string_bonus: float = Field(-1.0, description="Score reduction (bonus) for placing a note on an open string.")
    barre_penalty_base: float = Field(2.0, description="Soft penalty bias for inferring a heuristic barre.")
    string_crossing_penalty: float = Field(0.5, description="Penalty protecting against disjointed string jumps.")
    minimax_worst_case_weight: float = Field(5.0, description="Weighting of the highest individual local note cost in DP state summation.")
    minimax_max_states: int = Field(64, description="Beam search width limit.")

class TechniqueThresholds(BaseModel):
    """
    Thresholds for Harmonic-Percussive Source Separation and envelope detection.
    Currently used in technique.py.
    """
    hpss_ratio_threshold: float = Field(2.5, description="Feature ratio above which an event is strongly percussive.")
    hnr_threshold: float = Field(3.0, description="Harmonic-to-Noise Ratio to distinguish clean string vibrations.")
    slap_velocity_min: float = Field(0.8, description="Minimum ADSR peak velocity to trigger a slap detection.")

class TranscriptionConfig(BaseModel):
    """
    Master configuration object.
    """
    pitch: PitchThresholds = PitchThresholds()
    mapper: MapperThresholds = MapperThresholds()
    technique: TechniqueThresholds = TechniqueThresholds()

# Global default config
config = TranscriptionConfig()
