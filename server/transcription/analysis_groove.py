import librosa
import numpy as np
from .artifact_manager import ArtifactManager

class GrooveAnalysis:
    """Stage 5b: Rhythmic Groove Analysis."""
    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def detect_groove(self, audio_path: str) -> dict:
        """Characterise rhythmic feel from IOI statistics."""
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        onset_times = librosa.onset.onset_detect(y=y, sr=sr, units="time")

        if len(onset_times) < 4:
            return {"type": "Straight (Tight Grid)", "swingRatio": 1.0}

        iois = np.diff(onset_times)
        iois = iois[(iois > 0.05) & (iois < 2.0)]

        if len(iois) < 3:
            return {"type": "Straight (Tight Grid)", "swingRatio": 1.0}

        avg = float(np.mean(iois))
        variance = float(np.std(iois) / avg if avg > 0 else 0.0)

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

        result = {"type": groove_type, "swingRatio": swing_ratio}
        self.am.log_stat("analysis", "groove", result)
        return result
        
    def estimate_bpm(self, audio_path: str) -> int:
        """Estimate tempo using librosa beat tracker."""
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(np.atleast_1d(tempo)[0])
        clamped_bpm = int(np.clip(np.round(bpm), 40, 250))
        self.am.log_stat("analysis", "bpm", clamped_bpm)
        return clamped_bpm
