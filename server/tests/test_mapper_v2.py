import pytest
from core.thresholds import config
from transcription.artifact_manager import ArtifactManager
from transcription.mapper_v2 import generate_fretboard_mapping, FretboardMapperV2

@pytest.fixture
def am():
    return ArtifactManager()

@pytest.fixture
def standard_tuning():
    return [40, 45, 50, 55, 59, 64] # E2 A2 D3 G3 B3 E4

def test_mapper_poly_collisions_rejected(am, standard_tuning):
    """Ensure simultaneous notes never share a string."""
    mapper = FretboardMapperV2(am, standard_tuning)
    
    # 3 notes identically positioned at the same time
    frame = [
        {"pitch": 55, "startTime": 1.0, "duration": 0.5},
        {"pitch": 59, "startTime": 1.0, "duration": 0.5},
        {"pitch": 64, "startTime": 1.0, "duration": 0.5}
    ]
    
    states = mapper.solve_frame_states(frame, 0)
    for state in states:
        comb = state["combination"]
        strings = [c["stringIdx"] for c in comb]
        # Should be completely distinct
        assert len(set(strings)) == len(strings)

def test_mapper_heroic_stretch_fallback(am, standard_tuning):
    """Ensure impossible geometric spans trigger fallback state instead of crashing."""
    mapper = FretboardMapperV2(am, standard_tuning)
    
    # Intentionally impossible chord on same timeline (pitch 41 = Low F on string 6, pitch 80 = G# on string 1 high up)
    frame = [
        {"pitch": 41, "startTime": 1.0, "duration": 0.5},
        {"pitch": 80, "startTime": 1.0, "duration": 0.5}
    ]
    
    states = mapper.solve_frame_states(frame, 0)
    assert len(states) >= 1
    # Because stretch is ~ 15 frets, it should hit fallback penalty
    if len(states) == 1:
        assert states[0]["debug"].get("is_fallback") == True

def test_mapper_barre_heuristic(am, standard_tuning):
    """Assert barre chord shapes correctly identify the barre proxy and score appropriately."""
    mapper = FretboardMapperV2(am, standard_tuning)
    
    # F Major Barre (1st fret, string 0, 1, 2)
    # Pitches: F (e->1, 65), C (B->1, 60), G# (G->1, 56)
    frame = [
        {"pitch": 65, "startTime": 1.0, "duration": 0.5},
        {"pitch": 60, "startTime": 1.0, "duration": 0.5},
        {"pitch": 56, "startTime": 1.0, "duration": 0.5}
    ]
    
    states = mapper.solve_frame_states(frame, 0)
    # The optimal state should identify as a barre
    best = states[0]
    assert best["debug"]["barre_inferred"] == True

def test_alternative_positions_exposure(am, standard_tuning):
    """Assert Alternative positions logic correctly emits metadata."""
    notes = [
        {"pitch": 60, "startTime": 1.0, "duration": 0.5, "type": "melodic", "raw_confidence": 0.9}
    ]
    
    res = generate_fretboard_mapping(notes, standard_tuning, am)
    
    assert len(res) == 1
    assert "alternative_positions" in res[0]
    # C4 pitch (60) has multiple spots (e.g. B string 1st fret, G string 5th fret)
    assert len(res[0]["alternative_positions"]) > 1
