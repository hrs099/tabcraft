"""
pitch.py — Lightweight librosa-based pitch extraction engine.

Replaces the TensorFlow-dependent basic-pitch library with a pure
librosa implementation (pYIN + CQT) to fit within Render's 512 MB
free-tier RAM constraint while significantly improving note quality.

Key quality improvements over basic-pitch defaults:
  1. pYIN gives cleaner monophonic pitch tracks with fewer ghost notes
  2. CQT energy gating eliminates sub-threshold "buzzy" detections
  3. Minimum duration filter removes micro-transient artifacts
  4. Confidence-based pruning removes low-probability notes early
"""

import numpy as np
import librosa


# ── Constants ────────────────────────────────────────────────────────────────
SR = 22050                     # Standard sample rate
HOP_LENGTH = 512               # ~23 ms hop — good resolution vs speed
FMIN = 73.42                   # D2 — covers all drop tunings
FMAX = 1318.51                 # E6 — top of guitar range
MIN_NOTE_DURATION_SEC = 0.06   # 60 ms — suppress micro-transients
CONFIDENCE_FLOOR = 0.35        # Notes below this pYIN confidence are discarded
CQT_ENERGY_FLOOR = 0.005       # Minimum CQT energy to consider a frame "active"


def _hz_to_midi(hz: float) -> int:
    """Convert frequency in Hz to nearest MIDI note number."""
    if hz <= 0:
        return 0
    return int(round(69 + 12 * np.log2(hz / 440.0)))


def _segment_pitch_track(f0: np.ndarray, voiced: np.ndarray,
                         confidence: np.ndarray, energy: np.ndarray,
                         hop_length: int, sr: int) -> list:
    """
    Segment a continuous pitch track into discrete note events.

    Groups consecutive voiced frames with the same MIDI pitch into single
    note events with averaged confidence scores.  Applies minimum duration
    and energy gating to suppress artifacts.
    """
    frame_duration = hop_length / sr
    events = []
    n_frames = len(f0)

    i = 0
    while i < n_frames:
        # Skip unvoiced / silent frames
        if not voiced[i] or f0[i] <= 0 or energy[i] < CQT_ENERGY_FLOOR:
            i += 1
            continue

        midi = _hz_to_midi(f0[i])
        start_frame = i
        conf_acc = [confidence[i]]
        energy_acc = [energy[i]]

        # Extend while same pitch continues
        i += 1
        while i < n_frames and voiced[i] and f0[i] > 0:
            cur_midi = _hz_to_midi(f0[i])
            if cur_midi != midi:
                break
            conf_acc.append(confidence[i])
            energy_acc.append(energy[i])
            i += 1

        end_frame = i
        duration = (end_frame - start_frame) * frame_duration

        # ── Gate: minimum duration ──
        if duration < MIN_NOTE_DURATION_SEC:
            continue

        # ── Gate: confidence floor ──
        avg_conf = float(np.mean(conf_acc))
        if avg_conf < CONFIDENCE_FLOOR:
            continue

        start_time = start_frame * frame_duration
        avg_energy = float(np.mean(energy_acc))

        # Amplitude proxy: use mean energy (already normalised later)
        amplitude = min(1.0, avg_energy * 10)

        events.append({
            "pitch": midi,
            "startTime": round(start_time, 4),
            "duration": round(duration, 4),
            "amplitude": amplitude,
            "confidence": avg_conf,
            "technique": "pluck",
            "type": "melodic",
            "label": None,
            "pitchBends": [],
        })

    return events


def extract_notes(audio_path: str, **_kwargs) -> list:
    """
    Run lightweight librosa pitch extraction on an audio file.

    Returns a list of note event dicts compatible with the downstream
    pipeline (pitch_cleaner → technique → mapper).

    Memory usage: ~80-150 MB (vs ~400-500 MB for basic-pitch/TensorFlow).
    """
    # Load audio — mono, resampled
    y, sr = librosa.load(audio_path, sr=SR, mono=True)

    # ── pYIN pitch tracking ──────────────────────────────────────────────────
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=FMIN,
        fmax=FMAX,
        sr=sr,
        hop_length=HOP_LENGTH,
        fill_na=0.0,
    )

    # ── CQT energy envelope (per-frame) ──────────────────────────────────────
    C = np.abs(librosa.cqt(
        y, sr=sr, hop_length=HOP_LENGTH,
        fmin=FMIN, n_bins=84, bins_per_octave=12,
    ))
    cqt_energy = np.sum(C, axis=0)
    max_energy = cqt_energy.max()
    if max_energy > 0:
        cqt_energy = cqt_energy / max_energy

    # Ensure arrays are the same length
    min_len = min(len(f0), len(cqt_energy))
    f0 = f0[:min_len]
    voiced_flag = voiced_flag[:min_len]
    voiced_prob = voiced_prob[:min_len]
    cqt_energy = cqt_energy[:min_len]

    # ── Segment into note events ─────────────────────────────────────────────
    raw_events = _segment_pitch_track(
        f0, voiced_flag, voiced_prob, cqt_energy,
        HOP_LENGTH, sr,
    )

    if not raw_events:
        raise RuntimeError(
            "Pitch extraction returned zero note events. "
            "Check that the audio file contains pitched guitar signal within "
            "the frequency range [73 Hz - 1319 Hz] and is not silent."
        )

    # ── Deduplicate overlapping notes at the same pitch ──────────────────────
    merged = []
    for evt in raw_events:
        if merged:
            prev = merged[-1]
            gap = evt["startTime"] - (prev["startTime"] + prev["duration"])
            if prev["pitch"] == evt["pitch"] and gap < 0.04:
                new_end = max(
                    prev["startTime"] + prev["duration"],
                    evt["startTime"] + evt["duration"]
                )
                prev["duration"] = round(new_end - prev["startTime"], 4)
                prev["confidence"] = (prev["confidence"] + evt["confidence"]) / 2
                prev["amplitude"] = max(prev["amplitude"], evt["amplitude"])
                continue
        merged.append(evt)

    # ── Min-Max confidence normalisation ─────────────────────────────────────
    raw_confs = np.array([e["confidence"] for e in merged], dtype=np.float64)
    conf_min = raw_confs.min()
    conf_max = raw_confs.max()

    if conf_max > conf_min:
        normalised = (raw_confs - conf_min) / (conf_max - conf_min) * 0.99
    else:
        normalised = raw_confs.clip(0.0, 0.99)

    for event, norm_conf in zip(merged, normalised):
        event["raw_confidence"] = event["confidence"]
        event["normalized_confidence"] = float(norm_conf)
        event["confidence"] = float(norm_conf)

    return merged
