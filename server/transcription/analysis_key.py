import librosa
import numpy as np
from .artifact_manager import ArtifactManager

class KeyAnalysis:
    """Stage 5a: Musical Key Analysis."""
    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def detect_key(self, audio_path: str) -> dict:
        """Krumhansl-Schmuckler key profile analysis."""
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=36)
        mean_chroma = chroma.mean(axis=1)

        best_key = "C"
        best_mode = "Major"
        best_score = -np.inf

        for root in range(12):
            rotated = np.roll(mean_chroma, -root)
            maj_score = float(np.corrcoef(rotated, self.MAJOR_PROFILE)[0, 1])
            min_score = float(np.corrcoef(rotated, self.MINOR_PROFILE)[0, 1])

            if maj_score > best_score:
                best_score = maj_score
                best_key = self.NOTE_NAMES[root]
                best_mode = "Major"

            if min_score > best_score:
                best_score = min_score
                best_key = self.NOTE_NAMES[root]
                best_mode = "Minor"

        result = {
            "root": best_key,
            "scale": best_mode,
            "confidence": max(0.0, best_score)
        }
        
        self.am.log_stat("analysis", "key", result)
        return result
