import librosa
import numpy as np
import soundfile as sf
import os
from .artifact_manager import ArtifactManager

class AudioPreprocessor:
    """Stage 1: Preprocess Audio."""
    TARGET_SR = 22050
    
    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def process(self, audio_path: str) -> str:
        """
        Loads audio, checks channels, forces mono, resamples, normalizes peak, 
        and caches to a temporary artifact. Returns cached path.
        """
        info = sf.info(audio_path)
        self.am.log_stat("preprocess", "original_sr", info.samplerate)
        self.am.log_stat("preprocess", "original_channels", info.channels)
        self.am.log_stat("preprocess", "duration_sec", info.duration)
        
        # Load mono, resampled
        y, sr = librosa.load(audio_path, sr=self.TARGET_SR, mono=True)
        
        # Peak Normalization
        peak = np.max(np.abs(y))
        self.am.log_stat("preprocess", "peak_amplitude_before", float(peak))
        
        if peak > 0:
            y = y / peak
            
        # Compute RMS
        rms = float(np.mean(librosa.feature.rms(y=y)))
        self.am.log_stat("preprocess", "rms_amplitude_after", rms)
        
        # Cache out for next stages
        out_path = os.path.join(self.am.base_dir, "preprocessed.wav")
        sf.write(out_path, y, self.TARGET_SR)
        
        self.am.log_stat("preprocess", "cached_path", out_path)
        return out_path
