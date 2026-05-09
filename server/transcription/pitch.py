import numpy as np
from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH


def extract_notes(
    audio_path: str,
    onset_threshold: float = 0.5,
    frame_threshold: float = 0.3,
) -> list:
    """
    Run Spotify Basic Pitch neural AMT on an audio file.

    Returns a list of note event dicts with real per-note confidence
    extracted from the model's note probability matrix, NOT from velocity.

    Frequency bounds cover standard through drop-A tunings with headroom:
        minimum_frequency = 73.42 Hz  (D2  — below standard low E2=82.41 Hz)
        maximum_frequency = 1318.51 Hz (E6  — top of guitar range)
    """
    model_output, midi_data, note_events = predict(
        audio_path,
        model_or_model_path=ICASSP_2022_MODEL_PATH,
        onset_threshold=onset_threshold,
        frame_threshold=frame_threshold,
        minimum_note_length=58,       # ~60 ms — suppresses false micro-transients
        minimum_frequency=73.42,      # D2  — covers all drop tunings
        maximum_frequency=1318.51,    # E6  — top of guitar range
        melodia_trick=True,           # Reduces octave errors in polyphonic content
    )

    # ── Extract per-note confidence from model_output ──────────────────────────
    # model_output['note'] is a 2-D probability matrix:
    #   shape = (num_frames, num_freq_bins)
    # Basic Pitch maps MIDI pitch p → freq_bin index = p - MIDI_OFFSET
    # The model uses sr=22050, hop=256, so frame_idx = time_s * (22050 / 256)

    FRAMES_PER_SEC = 22050.0 / 256.0   # ≈ 86.13 frames/sec
    MIDI_OFFSET = 21                    # Lowest MIDI pitch in the model's output bins

    note_prob_matrix = model_output.get("note")  # (T, 88) float32 array

    formatted_events = []

    for note in note_events:
        # Basic Pitch note_events signature:
        #   (start_time_s, end_time_s, pitch_midi, amplitude, pitch_bends)
        start_time = float(note[0])
        end_time = float(note[1])
        pitch_midi = int(note[2])
        amplitude = float(note[3])
        pitch_bends = list(note[4]) if len(note) > 4 and note[4] is not None else []

        # Normalise amplitude to [0, 1] — Basic Pitch returns 0-127 scale
        if amplitude > 1.0:
            amplitude = amplitude / 127.0

        # ── Real confidence: average model probability over the note's active frames ──
        if note_prob_matrix is not None:
            freq_bin = pitch_midi - MIDI_OFFSET
            if 0 <= freq_bin < note_prob_matrix.shape[1]:
                frame_start = int(np.floor(start_time * FRAMES_PER_SEC))
                frame_end = int(np.ceil(end_time * FRAMES_PER_SEC))
                # Clamp to valid frame range
                frame_start = max(0, frame_start)
                frame_end = min(note_prob_matrix.shape[0], frame_end)

                if frame_end > frame_start:
                    confidence = float(
                        np.mean(note_prob_matrix[frame_start:frame_end, freq_bin])
                    )
                else:
                    confidence = float(amplitude)  # Fallback: use amplitude
            else:
                confidence = float(amplitude)
        else:
            # model_output did not contain 'note' key (older basic-pitch versions)
            confidence = float(amplitude)

        formatted_events.append({
            "pitch": pitch_midi,
            "startTime": start_time,
            "duration": float(end_time - start_time),
            "amplitude": amplitude,
            "confidence": confidence,
            "technique": "pluck",         # Default; technique.py classifies this
            "type": "melodic",            # Default; technique.py updates to percussion
            "label": None,
            "pitchBends": pitch_bends,    # Needed for Phase 4 harmonic detection
        })

    if not formatted_events:
        raise RuntimeError(
            "Basic Pitch returned zero note events. "
            "Check that the audio file contains pitched guitar signal within "
            "the frequency range [73 Hz – 1319 Hz] and is not silent."
        )

    # ── Min-Max confidence normalisation ──────────────────────────────────────
    # Scale the full confidence array so the maximum becomes 0.99 and all other
    # values are shifted proportionally (preserving relative ranking).
    # This avoids artificially capping strong notes and lifts weak-but-valid
    # notes out of near-zero territory.
    raw_confs = np.array([e["confidence"] for e in formatted_events], dtype=np.float64)
    conf_min = raw_confs.min()
    conf_max = raw_confs.max()

    if conf_max > conf_min:                         # Normal case — spread exists
        normalised = (raw_confs - conf_min) / (conf_max - conf_min) * 0.99
    else:                                           # All identical — keep as-is
        normalised = raw_confs.clip(0.0, 0.99)

    for event, norm_conf in zip(formatted_events, normalised):
        event["raw_confidence"] = event["confidence"]
        event["normalized_confidence"] = float(norm_conf)
        event["confidence"] = float(norm_conf)

    return formatted_events
