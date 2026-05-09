# TabCraft v2.0 - Audio → Tab Pipeline

TabCraft is an AI-powered fingerstyle guitar transcription engine. It intelligently processes raw acoustic audio to generate readable, playable, and ergonomic tablatures.

## Architecture of the Audio → Tab Pipeline (V2)

The V2 Transcription pipeline is decoupled and operates entirely modularly:

1. **Upload & Ingestion**
   - User uploads audio via drag & drop or file selection picker (`src/components/AudioToTab.jsx`).
   - The file, alongside selected tuning and technique extraction flags, is pushed to `/api/v2/transcribe`.

2. **Stage 1 & 2: Preprocess & Sources Separation**
   - Resampling, normalization, and HPSS (Harmonic-Percussive Source Separation) isolates percussive thumps from harmonic decay (`server/transcription/preprocess.py` + `separation.py`).

3. **Stage 3: Pitch Extraction & Cleanup**
   - Spotify's `basic-pitch` extracts raw transcription events.
   - Filtering routines purge phantom notes (`server/transcription/pitch_cleaner.py`).

4. **Stage 4: Technique Feature Extraction**
   - Extracts Harmonic-to-Noise Ratio (HNR), Transient Energy, and Zero-Crossing Rates to heuristically assign structural technique labels matching the requested user checks (Kick Drum, Snare, String Slaps) (`server/transcription/feature_extraction.py`).

5. **Stage 5: Ergonomic Fretboard Viterbi Decoder**
   - Translates abstract MIDI sequences physically onto a target guitar neck. Uses dynamic programming to identify collision-less, musically reasonable fretting geometries accounting for capos (`server/transcription/mapper_v2.py`).

6. **Frontend Routing & Rendering**
   - JSON outputs hit the React frontend Adapter boundary (`src/utils/transcriptionAdapters.js`), reshaping the sequence into structured playable sequences.
   - The Fretboard and Intelligence Dashboard update instantly with raw technique logs and health indicators.

## Running the Application

### 1. Unified Startup
The easiest way to start both backend and frontend is using the Windows script provided:
```cmd
StartAstra.bat
```
This automatically boots FastAPI under `venv` and spins up the Vite development server.

### 2. Manual Startup (Backend)
```bash
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Manual Startup (Frontend)
```bash
npm install
npm run dev
```

### 4. Running Tests
The Python backend uses `pytest` for unit/integration logic verification:
```bash
cd server
venv\Scripts\activate
pytest tests/
```

## Adding New Tunings & Techniques

### Tunings
- **Static Tunings:** To add a pre-configured tuning UI block, append it to `TUNINGS` inside `src/utils/music.js`. Provide the open string tuning as a 6-element integer array representing MIDI indexes, ordered low-to-high.
- **Custom Tunings:** The user can input these dynamically via the "Custom..." option. So long as the format conforms to 6 valid MIDI note indexes, TabCraft will auto-map transcription safely.

### Techniques
- **Backend Thresholds:** To implement new Technique recognition rules, define their logic inside `server/transcription/feature_extraction.py`. Expand `extract_features` checks against `percussives_config` to filter thresholds.
- **Frontend Labels:** Register the human-readable label in `PERCUSSIVES` array in `src/components/AudioToTab.jsx` to render the UI Checkbox toggle automatically.
