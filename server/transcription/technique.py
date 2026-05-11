import librosa
import numpy as np

def classify_events(audio_path: str, note_events: list, tuning_list: list = None) -> list:
    if not note_events: return []
    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    S = np.abs(librosa.stft(y))
    S_harm = np.abs(librosa.stft(y_harmonic))
    freqs = librosa.fft_frequencies(sr=sr)
    HARMONIC_INTERVALS = {12, 19, 24}
    open_strings = set(tuning_list) if tuning_list else {40, 45, 50, 55, 59, 64}
    enriched = []
    note_events.sort(key=lambda x: x["startTime"])
    prev_melodic_event = None
    percussive_times = []
    for event in note_events:
        start_time = float(event["startTime"])
        duration = float(event["duration"])
        end_time = float(start_time + duration)
        pitch = int(event["pitch"])
        amplitude = float(event["amplitude"])
        confidence = float(event.get("confidence", 0.8))
        pitch_bends = event.get("pitchBends", [])
        if amplitude > 1.0: amplitude = amplitude / 127.0
        start_sample = int(start_time * sr)
        end_sample = int(end_time * sr)
        if end_sample <= start_sample or start_sample >= len(y):
            start_sample = max(0, min(start_sample, len(y) - 1))
            end_sample = min(start_sample + 1, len(y))
        attack_window = int(0.05 * sr)
        perc_slice = y_percussive[start_sample:end_sample]
        harm_slice = y_harmonic[start_sample:end_sample]
        slice_len = len(perc_slice)
        act_attack = min(attack_window, slice_len)
        attack_energy = float(np.sum(perc_slice[:act_attack] ** 2))
        decay_energy = float(np.sum(perc_slice[act_attack:] ** 2))
        total_perc = float(np.sum(perc_slice ** 2))
        total_harm = float(np.sum(harm_slice ** 2))
        hpss_ratio = total_perc / max(total_harm, 1e-10)
        transient_heavy = (attack_energy > 1.5 * decay_energy)
        start_frame = librosa.time_to_frames(start_time, sr=sr)
        end_frame = librosa.time_to_frames(end_time, sr=sr)
        if end_frame <= start_frame: end_frame = start_frame + 1
        S_chunk = S[:, start_frame:end_frame]
        S_harm_chunk = S_harm[:, start_frame:end_frame]
        harm_energy_spec = np.sum(S_harm_chunk)
        total_energy_spec = np.sum(S_chunk)
        hnr = harm_energy_spec / max((total_energy_spec - harm_energy_spec), 1e-10)
        if total_energy_spec > 0:
            centroid = np.sum(freqs[:, None] * S_chunk) / total_energy_spec
        else:
            centroid = 0.0
        technique = "pluck"
        label = ""
        event_type = "melodic"
        if hpss_ratio > 2.5 and transient_heavy:
            if hnr < 0.2 and centroid > 700:
                technique = "body_hit"; label = "K"; event_type = "percussion"
            else:
                technique = "thumb_slap"; label = "S"; event_type = "percussion"
        elif hnr > 3.0 and confidence > 0.85:
            is_nh = any((pitch - open_p) in HARMONIC_INTERVALS for open_p in open_strings)
            if is_nh: technique = "natural_harmonic"; label = "NH"
            else: technique = "artificial_harmonic"; label = "AH"
        else:
            if prev_melodic_event and (start_time - prev_melodic_event["startTime"] < 0.4):
                if amplitude < prev_melodic_event["amplitude"] * 0.65:
                    interval = abs(pitch - prev_melodic_event["pitch"])
                    if interval > 5: technique = "tap"; label = "T"
                    elif pitch > prev_melodic_event["pitch"]: technique = "hammer_on"; label = "H"
                    else: technique = "pull_off"; label = "P"
        if event_type == "percussion": percussive_times.append(start_time)
        enriched.append({"pitch": pitch, "startTime": start_time, "duration": end_time - start_time, "amplitude": amplitude, "confidence": confidence, "technique": technique, "type": event_type, "label": label, "pitchBends": pitch_bends})
        if event_type == "melodic": prev_melodic_event = {"pitch": pitch, "startTime": start_time, "amplitude": amplitude}
    for event in enriched:
        if event["type"] == "melodic":
            is_slap_stroke = any(abs(event["startTime"] - pt) <= 0.02 for pt in percussive_times)
            if is_slap_stroke: event["technique"] = "slap_stroke"; event["label"] = "S"
    return enriched
