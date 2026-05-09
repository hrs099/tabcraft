import soundfile as sf
import numpy as np
import os
import json
from transcription.pipeline_v2 import process_audio_v2
import traceback

SR = 22050
DEST_DIR = os.path.join(os.path.dirname(__file__), "regression_assets")
os.makedirs(DEST_DIR, exist_ok=True)

def generate_wave(frequencies, durations, type_="melodic"):
    chunks = []
    
    for f, d in zip(frequencies, durations):
        if hasattr(f, "__iter__"):
            samples = int(d * SR)
            t = np.linspace(0, d, samples, endpoint=False)
            chord_y = sum([np.sin(2 * np.pi * freq * t) for freq in f])
            chunks.append(chord_y * (1.0 / len(f)))
        else:
            if type_ == "percussive" and f == 0:
                samples = int(d * SR)
                noise = np.random.randn(samples) * 0.5
                env = np.exp(-15 * np.linspace(0, 1, samples))
                chunks.append(noise * env)
            else:
                samples = int(d * SR)
                t = np.linspace(0, d, samples, endpoint=False)
                chunks.append(np.sin(2 * np.pi * f * t))
                
    return np.concatenate(chunks)

cases = [
    {
        "name": "simple_melodic",
        "freqs": [440, 493.88, 523.25], # A4, B4, C5
        "durs": [0.5, 0.5, 0.5],
        "tuning": [40, 45, 50, 55, 59, 64],
        "type": "melodic"
    },
    {
        "name": "simple_chord",
        "freqs": [[261.63, 329.63, 392.00]], # C Major chord
        "durs": [1.0],
        "tuning": [40, 45, 50, 55, 59, 64],
        "type": "melodic"
    },
    {
        "name": "percussive_clip",
        "freqs": [440, 0, 493.88], # Note, percussive hit, Note
        "durs": [0.3, 0.1, 0.3],
        "tuning": [40, 45, 50, 55, 59, 64],
        "type": "percussive"
    },
    {
        "name": "altered_tuning",
        "freqs": [73.42], # D2 low note
        "durs": [0.5],
        "tuning": [38, 45, 50, 55, 59, 64], # Drop D
        "type": "melodic"
    }
]

for case in cases:
    base_name = f"{case['name']}"
    wav_path = os.path.join(DEST_DIR, f"{base_name}.wav")
    json_path = os.path.join(DEST_DIR, f"{base_name}_output.json")
    
    # generate audio
    y = generate_wave(case["freqs"], case["durs"], type_=case["type"])
    sf.write(wav_path, y, SR)
    
    print(f"Testing {base_name}...")
    try:
        r = process_audio_v2(wav_path, case["tuning"], {"Kick Drum (Wrist)": True, "Snare (Thumb Slap)": True})
        with open(json_path, "w") as f:
            json.dump(r, f, indent=2)
        print(f"Saved {json_path}")
    except Exception as e:
        print(f"Failed {base_name}: {e}")
        traceback.print_exc()

print("DONE")
