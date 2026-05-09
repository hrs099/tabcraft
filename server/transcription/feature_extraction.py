import librosa
import numpy as np
from typing import List, Dict, Any
from .artifact_manager import ArtifactManager

class TechniqueFeatureExtractor:
    """Stage 4: Technique Feature Extraction — auto-detects percussion & harmonics."""
    
    # Time tolerance for "same beat" deduplication (seconds)
    SAME_BEAT_TOLERANCE = 0.04
    
    def __init__(self, artifact_manager: ArtifactManager, percussives_config: dict = None, tuning_list: List[int] = None):
        self.am = artifact_manager
        self.percussives_config = percussives_config or {}
        self.tuning_list = tuning_list or [40, 45, 50, 55, 59, 64]

    def extract_features(self, events: List[Dict[str, Any]], audio_path: str) -> List[Dict[str, Any]]:
        """
        Extracts advanced features (ADSR, HNR, Spectral Centroid) per event.
        Auto-detects percussion even when user hasn't checked boxes.
        Deduplicates impossible harmonics (2 on same beat).
        """
        self.am.log_stat("technique", "event_count", len(events))
        
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        
        freqs = librosa.fft_frequencies(sr=sr)
        
        # Pre-compute onset strength for better transient detection
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onset_times = librosa.times_like(onset_env, sr=sr)
        
        HARMONIC_INTERVALS = {12, 19, 24, 7, 5}  # expanded: 5th, 7th, 12th, 19th, 24th
        open_strings = set(self.tuning_list)

        enriched_events = []
        for i, event in enumerate(events):
            start_time = event["startTime"]
            duration = event["duration"]
            pitch = event.get("pitch", 0)
            
            start_sample = int(start_time * sr)
            end_sample = int((start_time + duration) * sr)
            
            start_sample = max(0, min(start_sample, len(y) - 1))
            end_sample = min(max(start_sample + 1, end_sample), len(y))
            
            perc_slice = y_percussive[start_sample:end_sample]
            harm_slice = y_harmonic[start_sample:end_sample]
            full_slice = y[start_sample:end_sample]
            
            # 1. ADSR Proxy
            attack_window = int(0.04 * sr)
            act_attack = min(attack_window, len(perc_slice))
            attack_energy = float(np.sum(perc_slice[:act_attack] ** 2))
            decay_energy = float(np.sum(perc_slice[act_attack:] ** 2))
            
            # 2. HPSS Ratio
            total_perc = float(np.sum(perc_slice ** 2))
            total_harm = float(np.sum(harm_slice ** 2))
            hpss_ratio = total_perc / max(total_harm, 1e-10)
            
            # 3. Spectral Analysis
            S_chunk = np.abs(librosa.stft(full_slice))
            if S_chunk.size > 0:
                mean_spec = np.mean(S_chunk, axis=1)
                total_energy_spec = np.sum(mean_spec)
                centroid = np.sum(freqs * mean_spec) / max(total_energy_spec, 1e-10)
                
                peak_spec = np.max(mean_spec)
                noise_floor = np.median(mean_spec)
                hnr = float(peak_spec / (noise_floor + 1e-9))
                
                # Spectral flatness — high means noise-like (percussion)
                flatness = float(librosa.feature.spectral_flatness(S=S_chunk).mean())
            else:
                centroid = 0.0
                hnr = 1.0
                flatness = 0.0

            zcr = float(np.mean(librosa.feature.zero_crossing_rate(full_slice)))
            
            # 4. Onset strength at this time
            onset_idx = np.searchsorted(onset_times, start_time)
            onset_idx = min(onset_idx, len(onset_env) - 1)
            onset_strength = float(onset_env[onset_idx])
            
            event_copy = dict(event)
            event_copy["technique_features"] = {
                "hnr": hnr,
                "centroid": centroid,
                "hpss_ratio": hpss_ratio,
                "zcr": zcr,
                "flatness": flatness,
                "onset_strength": onset_strength,
            }
            
            # --- Classifier Logic ---
            # More robust transient detection: uses onset strength + HPSS ratio + spectral flatness
            is_transient = (
                (hpss_ratio > 1.2 and flatness > 0.3 and onset_strength > 2.0)
                or (attack_energy > 1.5 * decay_energy and hpss_ratio > 2.0)
                or (hnr < 1.5 and zcr > 0.15 and flatness > 0.4)
            )
            
            # AUTO-DETECT percussion: don't require user checkboxes
            if is_transient:
                event_copy["type"] = "percussion"
                # Kick: low centroid, noise-like, deep thump
                if centroid < 1500 and hnr < 2.5:
                    event_copy["technique"] = "kick"
                    event_copy["label"] = "K"
                # Snare: high centroid, sharp noise burst
                elif centroid > 2500 or (flatness > 0.5 and zcr > 0.2):
                    event_copy["technique"] = "snare"
                    event_copy["label"] = "S"
                # Slap: mid-range
                else:
                    event_copy["technique"] = "slap"
                    event_copy["label"] = "x"
            else:
                # Melodic techniques
                event_copy["type"] = "melodic"
                
                # Harmonics Detection
                is_nh_node = any(
                    abs(pitch - open_p - interval) < 0.8
                    for open_p in open_strings
                    for interval in HARMONIC_INTERVALS
                )
                if hnr > 6.0 and is_nh_node:
                    event_copy["technique"] = "harmonic"
                    event_copy["label"] = "NH"
                elif hnr > 5.0 and centroid > 2500:
                    event_copy["technique"] = "harmonic"
                    event_copy["label"] = "AH"
                else:
                    event_copy["technique"] = "pluck"
                    event_copy["label"] = ""
                
            enriched_events.append(event_copy)
        
        # ─── Post-Processing: Harmonic Deduplication ───────────────────────
        # If two harmonics appear at the same time (within tolerance),
        # only keep the one with the highest HNR (most harmonic-sounding).
        enriched_events = self._dedup_simultaneous_harmonics(enriched_events)
            
        self.am.save_json_artifact("technique_features.json", enriched_events)
        return enriched_events
    
    def _dedup_simultaneous_harmonics(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove impossible duplicate harmonics on the same beat."""
        result = []
        i = 0
        while i < len(events):
            ev = events[i]
            
            if ev.get("technique") != "harmonic":
                result.append(ev)
                i += 1
                continue
            
            # Collect all harmonics within the time tolerance
            cluster = [ev]
            j = i + 1
            while j < len(events):
                next_ev = events[j]
                if abs(next_ev["startTime"] - ev["startTime"]) <= self.SAME_BEAT_TOLERANCE:
                    if next_ev.get("technique") == "harmonic":
                        cluster.append(next_ev)
                        j += 1
                        continue
                    else:
                        # Non-harmonic at same time is fine
                        break
                else:
                    break
                j += 1
            
            if len(cluster) > 1:
                # Keep only the harmonic with highest HNR
                best = max(cluster, key=lambda e: e.get("technique_features", {}).get("hnr", 0))
                result.append(best)
                # Convert the others to regular plucks
                for other in cluster:
                    if other is not best:
                        other_copy = dict(other)
                        other_copy["technique"] = "pluck"
                        other_copy["label"] = ""
                        result.append(other_copy)
                i = j
            else:
                result.append(ev)
                i += 1
        
        return result
