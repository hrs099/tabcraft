import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from core.thresholds import config
from transcription.schemas import TranscriptionResponseV2, TranscriptionResponse
from transcription.artifact_manager import ArtifactManager
from transcription.preprocess import AudioPreprocessor
from transcription.pitch_cleaner import PitchCleaner
from transcription.analysis_tuning import TuningAnalysis

from main import app

client = TestClient(app)

def test_config_loading():
    """Ensure centralized configuration loads correctly with expected defaults."""
    assert config.pitch.onset_threshold == 0.5
    assert config.technique.hpss_ratio_threshold == 2.5
    assert config.mapper.max_fret_stretch == 5

def test_v2_schema_validation():
    """Ensure the V2 schema structural constraints format properly."""
    mock_payload = {
        "transcription_version": "v2",
        "metadata": {
            "title": "Test",
            "duration": 0.0,
            "bpm": 120,
            "time_signature": "4/4",
            "key": {"root": "C", "scale": "Major", "confidence": 0.9, "analysis_status": "implemented"},
            "capo": 0,
            "tuning": {"selected": None, "candidates": [], "analysis_status": "scaffolded", "reason": "test"}
        },
        "analysis": {
            "groove_profile": {"type": "Straight", "swingRatio": 1.0, "push_drag_tendency": 0.0, "analysis_status": "heuristic"},
            "chord_segments": [],
            "confidence_summary": {"overall": 0.9, "melodic": 0.9, "percussive": 0.9, "confidence_source": "normalized"}
        },
        "events": {
            "notes": [
                {
                    "pitch": 60, "startTime": 1.0, "duration": 0.1, "amplitude": 0.8,
                    "raw_confidence": 0.5, "normalized_confidence": 0.8,
                    "technique": "pluck", "technique_status": "heuristic"
                }
            ], 
            "techniques": [], "percussion": []
        },
        "tab": {"columns": [], "layers": {"bass": [], "harmony": [], "melody": [], "percussion": []}}
    }
    obj = TranscriptionResponseV2(**mock_payload)
    assert obj.transcription_version == "v2"
    assert obj.metadata.tuning.analysis_status == "scaffolded"
    assert obj.events.notes[0].raw_confidence == 0.5

def test_pitch_event_merge():
    """Assert PitchCleaner merges overlapping identical pitches and handles confidence scaling."""
    am = ArtifactManager()
    cleaner = PitchCleaner(am)
    
    raw = [
        {"pitch": 60, "startTime": 1.0, "duration": 0.1, "confidence": 0.5},
        {"pitch": 60, "startTime": 1.05, "duration": 0.2, "confidence": 0.8},
        {"pitch": 62, "startTime": 2.0, "duration": 0.1, "confidence": 0.4}
    ]
    
    cleaned = cleaner.clean(raw)
    assert len(cleaned) == 2, "Should merge overlapping pitch 60 events"
    assert cleaned[0]["duration"] > 0.2, "Merged duration should extend"
    assert cleaned[0]["raw_confidence"] == 0.8, "Raw confidence should be maxed"
    assert "normalized_confidence" in cleaned[0], "Normalized confidence must be injected"

def test_scaffolded_tuning_response():
    """Ensure tuning analysis does not masquerade as real inference."""
    am = ArtifactManager()
    tuning_module = TuningAnalysis(am)
    res = tuning_module.detect_tuning_candidates([])
    
    assert res["analysis_status"] == "scaffolded"
    assert res["selected"] is None
    assert len(res["candidates"]) == 0
    assert "reason" in res

def test_artifact_path_configurable(monkeypatch):
    """Ensure artifact path is controlled via ASTRA_ARTIFACT_DIR."""
    monkeypatch.setenv("ASTRA_ARTIFACT_DIR", "/custom/dir")
    am = ArtifactManager()
    assert os.path.normpath(am.base_dir).startswith(os.path.normpath("/custom/dir"))

# Route tests (mocks required to bypass actual ML model loading)
@patch('main.process_audio')
def test_v1_endpoint_legacy(mock_process):
    mock_process.return_value = {
        "notes": [], "columns": [], 
        "metadata": {"bpm": 120, "key": "C Major", "scale": "Major", "confidence": 90, "suggestedTuning": "Standard", "grooveType": "Straight", "swingRatio": 1.0}
    }
    
    # We send dummy wav data
    res = client.post("/api/transcribe", files={"file": ("dummy.wav", b"RIFFfake")})
    assert res.status_code == 200
    assert "columns" in res.json()

@patch('main.process_audio_v2')
def test_v2_endpoint_modern(mock_process_v2):
    mock_process_v2.return_value = {
        "transcription_version": "v2",
        "metadata": {
            "title": "dummy", "duration": 1.0, "bpm": 120, "time_signature": "4/4",
            "key": {"root": "C", "scale": "Major", "confidence": 0.9, "analysis_status": "implemented"},
            "capo": 0, "tuning": {"selected": None, "candidates": [], "analysis_status": "scaffolded", "reason": "stub"}
        },
        "analysis": {
            "groove_profile": {"type": "Straight", "swingRatio": 1.0, "push_drag_tendency": 0.0, "analysis_status": "heuristic"},
            "chord_segments": [], "confidence_summary": {"overall": 0.9, "melodic": 0.9, "percussive": 0.9, "confidence_source": "fallback"}
        },
        "events": {"notes": [], "techniques": [], "percussion": []},
        "tab": {"columns": [], "layers": {"bass": [], "harmony": [], "melody": [], "percussion": []}}
    }
    
    res = client.post("/api/v2/transcribe", files={"file": ("dummy.wav", b"RIFFfake")})
    assert res.status_code == 200
    assert res.json()["transcription_version"] == "v2"
    assert "analysis" in res.json()
