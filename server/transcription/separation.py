import librosa
import numpy as np
import soundfile as sf
import os
from .artifact_manager import ArtifactManager
from core.thresholds import config

class SourceSeparator:
    """Stage 2: HPSS Source Separation."""
    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def separate(self, preprocessed_path: str) -> dict:
        margin = config.technique.hpss_ratio_threshold
        y, sr = librosa.load(preprocessed_path, sr=None)
        D = librosa.stft(y)
        H, P = librosa.decompose.hpss(D, margin=margin)
        y_harmonic = librosa.istft(H, length=len(y))
        y_percussive = librosa.istft(P, length=len(y))
        e_harm = float(np.sum(y_harmonic**2))
        e_perc = float(np.sum(y_percussive**2))
        ratio = e_perc / (e_harm + 1e-9)
        self.am.log_stat("separation", "energy_harmonic", e_harm)
        self.am.log_stat("separation", "energy_percussive", e_perc)
        self.am.log_stat("separation", "percussive_ratio", ratio)
        y_hybrid = y - (y_harmonic + y_percussive)
        harm_path = os.path.join(self.am.base_dir, "harmonic.wav")
        perc_path = os.path.join(self.am.base_dir, "percussive.wav")
        hybrid_path = os.path.join(self.am.base_dir, "hybrid_heuristic.wav")
        sf.write(harm_path, y_harmonic, sr)
        sf.write(perc_path, y_percussive, sr)
        sf.write(hybrid_path, y_hybrid, sr)
        self.am.log_stat("separation", "heuristic_layer_active", True)
        return {"harmonic": harm_path, "percussive": perc_path, "hybrid": hybrid_path}
