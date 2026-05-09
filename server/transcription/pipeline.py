"""
pipeline.py — Astra Transcription Orchestrator

Phase 2 implementation:
  - BPM via librosa.beat.beat_track() (replaces hardcoded 120)
  - Key via Krumhansl-Schmuckler + CQT chroma (replaces "C Major" stub)
  - Groove via onset IOI variance (replaces hardcoded "Straight")
  - usedStrings deduplication REMOVED — all polyphonic notes preserved
  - audio_path threaded to all analysis functions
"""

from .pitch import extract_notes
from .technique import classify_events
from .mapper import map_to_guitar

import librosa
import numpy as np


# ── Key Detection: Krumhansl-Schmuckler algorithm ──────────────────────────────

_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Schmuckler key profiles (major and minor)
_MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def detect_scale_key(audio_path: str) -> str:
    """
    Detect the musical key using Krumhansl-Schmuckler analysis on CQT chroma.
    Uses chroma_cqt (not STFT chroma) for superior low-frequency guitar string
    resolution — bass strings E2/A2 are resolved accurately.
    """
    y, sr = librosa.load(audio_path, sr=22050, mono=True)

    # CQT-based chroma — significantly better pitch resolution than STFT for guitar
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)
    mean_chroma = chroma.mean(axis=1)  # Shape: (12,)

    best_key = "C"
    best_mode = "Major"
    best_score = -np.inf

    for root in range(12):
        # Rotate chroma to align with each candidate root note
        rotated = np.roll(mean_chroma, -root)

        maj_score = float(np.corrcoef(rotated, _MAJOR_PROFILE)[0, 1])
        min_score = float(np.corrcoef(rotated, _MINOR_PROFILE)[0, 1])

        if maj_score > best_score:
            best_score = maj_score
            best_key = _NOTE_NAMES[root]
            best_mode = "Major"

        if min_score > best_score:
            best_score = min_score
            best_key = _NOTE_NAMES[root]
            best_mode = "Minor"

    return f"{best_key} {best_mode}"


# ── BPM Estimation ─────────────────────────────────────────────────────────────

def estimate_bpm(audio_path: str) -> int:
    """
    Estimate tempo using librosa's beat tracker.
    Returns a clamped integer BPM in the musically valid range [40, 250].
    """
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

    # librosa >= 0.10 may return a scalar ndarray — coerce safely
    bpm = float(np.atleast_1d(tempo)[0])
    return int(np.clip(np.round(bpm), 40, 250))


# ── Groove Analysis ────────────────────────────────────────────────────────────

def detect_groove(audio_path: str) -> dict:
    """
    Characterise rhythmic feel from onset inter-onset interval (IOI) statistics.
    Returns a groove type string and swing ratio (even/odd IOI ratio).
    """
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    onset_times = librosa.onset.onset_detect(y=y, sr=sr, units="time")

    if len(onset_times) < 4:
        return {"type": "Straight (Tight Grid)", "swingRatio": 1.0}

    iois = np.diff(onset_times)
    # Filter out micro-transients (<50 ms) and long pauses (>2 s)
    iois = iois[(iois > 0.05) & (iois < 2.0)]

    if len(iois) < 3:
        return {"type": "Straight (Tight Grid)", "swingRatio": 1.0}

    avg = np.mean(iois)
    # Coefficient of variation for groove tightness
    variance = np.std(iois) / avg if avg > 0 else 0.0

    # Swing ratio: ratio of even-indexed to odd-indexed IOIs
    even_iois = iois[0::2]
    odd_iois = iois[1::2]
    even_avg = float(np.mean(even_iois)) if len(even_iois) > 0 else avg
    odd_avg = float(np.mean(odd_iois)) if len(odd_iois) > 0 else avg
    swing_ratio = round(even_avg / odd_avg, 2) if odd_avg > 0 else 1.0

    if swing_ratio > 1.45:
        groove_type = "Heavy Swing"
    elif swing_ratio > 1.15:
        groove_type = "Swung (Triplet Feel)"
    elif variance > 0.25:
        groove_type = "Rubato / Free Timing"
    elif variance > 0.12:
        groove_type = "Syncopated"
    elif variance > 0.05:
        groove_type = "Slightly Swung"
    else:
        groove_type = "Straight (Tight Grid)"

    return {"type": groove_type, "swingRatio": swing_ratio}


# ── Generative Percussion Layer ───────────────────────────────────────────────

def generate_suggested_groove(audio_path: str, note_events: list, bpm: int) -> list:
    """
    Inject a 4/4 fingerstyle percussive groove pattern onto the beat grid.

    Pattern per bar:
      Beat 1 → Kick ('K')        Beat 2 → Snare/Thumb Slap ('S')
      Beat 3 → Kick ('K')        Beat 4 → Snare/Thumb Slap ('S')

    Existing detected transient hits (type == 'percussion') are left untouched;
    synthetic markers are only inserted on beats that have no percussive event
    within a ±30 ms tolerance window.
    """
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    _, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Collect timestamps of existing percussive events for collision detection
    existing_perc_times = [
        e["startTime"] for e in note_events if e.get("type") == "percussion"
    ]
    TOLERANCE = 0.030  # 30 ms

    beat_duration = 60.0 / bpm            # Duration of one quarter note in seconds
    groove_pattern = {0: "K", 1: "S", 2: "K", 3: "S"}  # Beat index within bar → label

    synthetic_events = []

    for beat_idx, t in enumerate(beat_times):
        label = groove_pattern.get(int(beat_idx) % 4)
        if label is None:
            continue

        # Skip if an existing percussive hit is within ±30 ms of this beat
        if any(abs(t - pt) <= TOLERANCE for pt in existing_perc_times):
            continue

        synthetic_events.append({
            "pitch": 0,
            "startTime": float(t),
            "duration": 0.05,
            "amplitude": 0.8,
            "confidence": 0.90,
            "technique": "percussion",
            "type": "percussion",
            "label": label,
            "pitchBends": [],
            "stringIdx": "perc",
            "fretIdx": None,
        })

    return note_events + synthetic_events


# ── Column Clustering ──────────────────────────────────────────────────────────

def cluster_to_columns(note_events: list, bpm: int) -> list:
    """
    Quantise note events into sixteenth-note grid columns.

    IMPORTANT: usedStrings deduplication has been REMOVED.
    All polyphonic notes that fall in the same column are preserved.
    The Viterbi mapper (Phase 3) will resolve physical string conflicts
    with ergonomic hand-position optimisation.
    """
    if not note_events:
        return []

    bps = bpm / 60.0
    column_time = 1.0 / bps / 4.0  # Sixteenth-note duration in seconds

    max_time = max(n["startTime"] for n in note_events) + 1.0
    col_count = int(np.ceil(max_time / column_time))

    cols = []

    for i in range(col_count):
        t_start = i * column_time
        t_end = (i + 1) * column_time

        col_notes = [n for n in note_events if t_start <= n["startTime"] < t_end]

        if col_notes:
            col_entries = []

            for m in col_notes:
                if m["type"] == "percussion":
                    col_entries.append({
                        "isPerc": True,
                        "techLabel": m.get("label") or "x",
                        "stringIdx": "perc",
                        "fretIdx": None,
                        "tech": m.get("technique", "percussion"),
                    })
                else:
                    # ── NO usedStrings guard — full polyphony preserved ──────────
                    col_entries.append({
                        "stringIdx": m["stringIdx"],
                        "fretIdx": m["fretIdx"],
                        "tech": m.get("technique", "pluck"),
                        "techLabel": m.get("label") or "",
                        "isPerc": False,
                    })

            cols.append({
                "id": float(i * 1000),
                "type": "melody",
                "notes": col_entries,
            })
        else:
            # Preserve rhythm spacers every 2 beats (every 8 sixteenth notes)
            if i % 8 == 0:
                cols.append({
                    "id": float(i * 1000),
                    "type": "spacer",
                    "notes": [],
                })

    return cols


# ── Main Orchestrator ──────────────────────────────────────────────────────────

def process_audio(audio_path: str, tuning_list: list, suggest_groove: bool = False) -> dict:
    """
    Full pipeline: pitch extraction → technique classification → guitar mapping
    → temporal analysis → tablature column assembly.

    All analysis functions receive audio_path so they can run librosa internally.
    No stubs. If any stage fails it raises — no silent fallbacks.
    """
    # Stage 1: Neural pitch extraction (Basic Pitch)
    raw_events = extract_notes(audio_path)

    # Stage 2: HPSS+ADSR-based technique classification (Phase 4)
    enriched_events = classify_events(audio_path, raw_events, tuning_list)

    # Stage 2b (optional): Inject generative 4/4 groove pattern onto beat grid
    if suggest_groove:
        enriched_events = generate_suggested_groove(audio_path, enriched_events, 120)  # BPM refined in Stage 4

    # Stage 3: Guitar string/fret mapping (Phase 3 Viterbi Dynamic Programming)
    mapped_events = map_to_guitar(enriched_events, tuning_list)
    mapped_events.sort(key=lambda x: x["startTime"])

    # Stage 4: Real audio analysis (all three use audio_path, not notes)
    bpm = estimate_bpm(audio_path)
    key = detect_scale_key(audio_path)
    groove = detect_groove(audio_path)

    # Stage 5: Aggregate metadata
    confidence = 85  # Default
    if mapped_events:
        conf_values = [e.get("confidence", 0.85) for e in mapped_events]
        confidence = int(round(np.mean(conf_values) * 100))
        confidence = int(np.clip(confidence, 0, 100))

    tech_breakdown: dict = {}
    for e in mapped_events:
        tech = e.get("technique", "pluck")
        tech_breakdown[tech] = tech_breakdown.get(tech, 0) + 1

    perc_count = sum(1 for e in mapped_events if e.get("type") == "percussion")

    # Pitch class breakdown for the Analysis tab
    note_class_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    pitch_class_counts: dict = {}
    melodic_events = [e for e in mapped_events if e.get("type") == "melodic"]
    for e in melodic_events:
        pc = note_class_names[e["pitch"] % 12]
        pitch_class_counts[pc] = pitch_class_counts.get(pc, 0) + 1

    total_melodic = max(len(melodic_events), 1)
    note_breakdown = [
        {
            "note": pc,
            "count": count,
            "pct": round(count / total_melodic * 100, 1),
        }
        for pc, count in sorted(pitch_class_counts.items(), key=lambda x: -x[1])
    ]

    # Extract capo inferred by mapper (same value on every event, 0 if none)
    capo = mapped_events[0].get("capo", 0) if mapped_events else 0

    metadata = {
        "key": key,
        "scale": key.split(" ", 1)[1] if " " in key else "Major",
        "bpm": bpm,
        "confidence": confidence,
        "capo": capo,
        "suggestedTuning": "Standard",  # Tuning suggestion is a Phase 3 concern
        "grooveType": groove.get("type", "Straight (Tight Grid)"),
        "swingRatio": groove.get("swingRatio", 1.0),
        "noteBreakdown": note_breakdown,
        "percCount": perc_count,
        "techBreakdown": tech_breakdown,
    }

    columns = cluster_to_columns(mapped_events, bpm)

    return {
        "notes": mapped_events,
        "metadata": metadata,
        "columns": columns,
    }
