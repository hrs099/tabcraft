import soundfile as sf
import numpy as np
import os

SR = 22050
DEST_DIR = os.path.join(os.path.dirname(__file__), "manual_test_assets")
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
        "name": "clean_fingerstyle.wav",
        "freqs": [440, 493.88, [261.63, 329.63, 392.00], 523.25],
        "durs": [0.5, 0.5, 1.0, 0.5],
        "type": "melodic"
    },
    {
        "name": "percussive_fingerstyle.wav",
        "freqs": [0, 0, 0, 0],
        "durs": [0.2, 0.2, 0.3, 0.1],
        "type": "percussive"
    },
    {
        "name": "mixed_clip.wav",
        "freqs": [440, 0, [261.63, 329.63, 392.00], 0, 523.25],
        "durs": [0.4, 0.2, 0.5, 0.1, 0.4],
        "type": "percussive"
    },
    {
        "name": "short_clip.wav",
        "freqs": [440],
        "durs": [0.05],
        "type": "melodic"
    },
    {
        "name": "long_clip.wav",
        "freqs": [440] * 30, # 30 seconds of A4 beeps
        "durs": [1.0] * 30,
        "type": "melodic"
    }
]

for case in cases:
    wav_path = os.path.join(DEST_DIR, case['name'])
    y = generate_wave(case["freqs"], case["durs"], type_=case["type"])
    sf.write(wav_path, y, SR)
    print(f"Saved {wav_path}")

# Create invalid file
invalid_path = os.path.join(DEST_DIR, "invalid_file.wav")
with open(invalid_path, "w") as f:
    f.write("This is not a real audio file.")
print(f"Saved {invalid_path}")
print("DONE")
