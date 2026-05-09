import librosa
import numpy as np

def classify_events(audio_path: str, note_events: list, tuning_list: list = None) -> list:
    """
    Phase 4: Advanced Technique Classifier using Envelope (ADSR) + Spectral Fingerprinting.
    Replaces "Pitch-only" centroid thresholding.
    
    1. Extracts ADSR decay rates to isolate true transients.
    2. Separates Thumb Slaps (low-freq resonance) from Body Hits (broadband wood noise).
    3. Harmonic-to-Noise Ratio (HNR) extraction for Natural/Artificial harmonics.
    4. Legato engine checking attack velocity deltas for Hammer-On / Pull-Off / Taps.
    """
    if not note_events:
        return []

    y, sr = librosa.load(audio_path, sr=22050, mono=True)
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    
    # Pre-compute STFT for HNR and spectral fingerprinting
    S = np.abs(librosa.stft(y))
    S_harm = np.abs(librosa.stft(y_harmonic))
    
    # Pre-compute frequency bins for Spectral Centroid analysis
    freqs = librosa.fft_frequencies(sr=sr)

    # Basic harmonic nodes relative to open strings (+12, +19, +24 semitones)
    HARMONIC_INTERVALS = {12, 19, 24}
    # tuning_list is low->high. 
    open_strings = set(tuning_list) if tuning_list else {40, 45, 50, 55, 59, 64}

    enriched = []
    
    # Sort chronologically for relative sequence logic (Legato)
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

        if amplitude > 1.0:
            amplitude = amplitude / 127.0

        start_sample = int(start_time * sr)
        end_sample = int(end_time * sr)

        if end_sample <= start_sample or start_sample >= len(y):
            start_sample = max(0, min(start_sample, len(y) - 1))
            end_sample = min(start_sample + 1, len(y))

        # ── 1. ADSR Envelope Profile ─────────────────────────────────────────
        # Attack window: First 50ms
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
        
        # Near-instant attack, immediate decay indicates transient nature
        transient_heavy = (attack_energy > 1.5 * decay_energy)

        # ── Spectral Fingerprinting (HNR & Centroid) ──────────────────────────
        start_frame = librosa.time_to_frames(start_time, sr=sr)
        end_frame = librosa.time_to_frames(end_time, sr=sr)
        
        if end_frame <= start_frame:
            end_frame = start_frame + 1
            
        S_chunk = S[:, start_frame:end_frame]
        S_harm_chunk = S_harm[:, start_frame:end_frame]
        
        # HNR (Harmonic to Noise Ratio)
        harm_energy_spec = np.sum(S_harm_chunk)
        total_energy_spec = np.sum(S_chunk)
        hnr = harm_energy_spec / max((total_energy_spec - harm_energy_spec), 1e-10)
        
        # Spectral Centroid (Center of mass)
        if total_energy_spec > 0:
            centroid = np.sum(freqs[:, None] * S_chunk) / total_energy_spec
        else:
            centroid = 0.0

        # Classification Init
        technique = "pluck"
        label = ""
        event_type = "melodic"
        
        # ── Classifier Routines ────────────────────────────────────────────────
        
        # A. Percussive & Body Hits
        if hpss_ratio > 2.5 and transient_heavy:
            # Body hits: Broadband wood resonance, low HNR, higher spectral centroid
            # Thumb slaps: Strong string attack -> lower centroid + measurable harmonic resonance
            if hnr < 0.2 and centroid > 700:
                technique = "body_hit"
                label = "K"
                event_type = "percussion"
            else:
                technique = "thumb_slap"
                label = "S"
                event_type = "percussion"
                
        # B. Harmonic Extraction (NH & AH)
        elif hnr > 3.0 and confidence > 0.85:
            # Check Natural Harmonic nodes (5, 7, 12th frets)
            is_nh = any((pitch - open_p) in HARMONIC_INTERVALS for open_p in open_strings)
            
            if is_nh:
                technique = "natural_harmonic"
                label = "NH"
            else:
                # Ghost quality, lacks deep fundamental root
                technique = "artificial_harmonic"
                label = "AH"
                
        # C. Legato Logic (Hammer-on / Tap)
        else:
            if prev_melodic_event and (start_time - prev_melodic_event["startTime"] < 0.4):
                # Detected low attack velocity compared to preceding note
                if amplitude < prev_melodic_event["amplitude"] * 0.65:
                    interval = abs(pitch - prev_melodic_event["pitch"])
                    
                    if interval > 5:
                        technique = "tap"  # Wide interval implies 2-hand tapping
                        label = "T"
                    elif pitch > prev_melodic_event["pitch"]:
                        technique = "hammer_on"
                        label = "H"
                    else:
                        technique = "pull_off"
                        label = "P"

        if event_type == "percussion":
            percussive_times.append(start_time)
            
        enriched.append({
            "pitch": pitch,
            "startTime": start_time,
            "duration": end_time - start_time,
            "amplitude": amplitude,
            "confidence": confidence,
            "technique": technique,
            "type": event_type,
            "label": label,
            "pitchBends": pitch_bends,
        })
        
        if event_type == "melodic":
            prev_melodic_event = {
                "pitch": pitch, 
                "startTime": start_time, 
                "amplitude": amplitude
            }

    # ── 2nd Pass: Slap-Stroke Intersection ─────────────────────────────────────
    # If a melodic note occurs simultaneously with a percussive slap stroke.
    for event in enriched:
        if event["type"] == "melodic":
            # Strict 20ms tolerance for simultaneous execution
            is_slap_stroke = any(abs(event["startTime"] - pt) <= 0.02 for pt in percussive_times)
            if is_slap_stroke:
                event["technique"] = "slap_stroke"
                # Override tab label visually but keep it melodic so it maps to string
                event["label"] = "S"

    return enriched
