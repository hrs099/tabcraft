import os
import time
import math
import traceback
from .artifact_manager import ArtifactManager
from .preprocess import AudioPreprocessor
from .separation import SourceSeparator
from .pitch_cleaner import PitchCleaner
from .feature_extraction import TechniqueFeatureExtractor
from .analysis_key import KeyAnalysis
from .analysis_groove import GrooveAnalysis
from .analysis_tuning import TuningAnalysis

# Legacy imports for stubs / underlying algorithms
from .pitch import extract_notes
from .mapper_v2 import generate_fretboard_mapping

# V2 Response Assembly
def process_audio_v2(audio_path: str, tuning_list: list, percussives: dict = None) -> dict:
    """
    Decoupled Phase 2 pipeline.
    """
    am = ArtifactManager()
    
    stage_diagnostics = []
    def log_stage(name, t0, err=None):
        stage_diagnostics.append({
            "stage": name, 
            "status": "success" if not err else "failed", 
            "error": str(err) if err else None, 
            "duration_ms": int((time.time() - t0) * 1000)
        })

    try:
        # Stage 1: Preprocess
        t0 = time.time()
        preprocessor = AudioPreprocessor(am)
        prep_path = preprocessor.process(audio_path)
        log_stage("preprocessing", t0)
        
        # Stage 2: Separation
        t0 = time.time()
        separator = SourceSeparator(am)
        sep_paths = separator.separate(prep_path)
        log_stage("separation", t0)
        
        # Stage 3: Pitch Extraction
        t0 = time.time()
        try:
            raw_events = extract_notes(prep_path)
            log_stage("pitch_extraction", t0)
        except Exception as e:
            am.log_stat("pitch", "error", str(e))
            log_stage("pitch_extraction", t0, e)
            raw_events = []
            
        # Stage 3b: Pitch Cleanup
        t0 = time.time()
        cleaner = PitchCleaner(am)
        clean_events = cleaner.clean(raw_events)
        log_stage("pitch_cleaner", t0)
        
        # Stage 4: Technique Features
        t0 = time.time()
        extractor = TechniqueFeatureExtractor(am, percussives, tuning_list)
        featured_events = extractor.extract_features(clean_events, prep_path)
        log_stage("technique_features", t0)
        
        # Stage 4b: Phase 3 Ergonomic Decoder (mapper_v2) 
        t0 = time.time()
        mapped_events = generate_fretboard_mapping(featured_events, tuning_list, am)
        log_stage("fretboard_mapping", t0)
        
        # Stage 5: Separate Analysis Modules
        t0 = time.time()
        key_analyzer = KeyAnalysis(am)
        key_info = key_analyzer.detect_key(prep_path)
        
        groove_analyzer = GrooveAnalysis(am)
        groove_info = groove_analyzer.detect_groove(prep_path)
        bpm = groove_analyzer.estimate_bpm(prep_path)
        
        tuning_analyzer = TuningAnalysis(am)
        tuning_info_raw = tuning_analyzer.detect_tuning_candidates(mapped_events)
        # Fallback to input tuning if detection is empty
        detected_tuning = tuning_info_raw.get("selected") or tuning_list
        log_stage("analysis", t0)
        
        # Response Assembly (V2 shape dict, bypassing schemas.py instantiation explicitly to avoid pydantic strictness overhead in core flow temporarily, allowing FastAPI to cast it)
        
        # Capo inference heuristic map (V1 compatible)
        capo = mapped_events[0].get("capo", 0) if mapped_events else 0
        
        # Identify detected percussion
        percussion_detected = list(set([e["technique"] for e in featured_events if e.get("type") == "percussion"]))
        
        # Calculate confidences
        conf_values = [e.get("normalized_confidence", 0.85) for e in mapped_events if "normalized_confidence" in e]
        overall_conf = sum(conf_values) / len(conf_values) if conf_values else 0.85
        
        response = {
            "transcription_version": "v2",
            "metadata": {
                "title": os.path.basename(audio_path),
                "duration": am.metadata.get("preprocess", {}).get("duration_sec", 0.0),
                "bpm": bpm,
                "time_signature": "4/4",
                "key": {
                    "root": key_info["root"],
                    "scale": key_info["scale"],
                    "name": f"{key_info['root']} {key_info['scale']}",
                    "confidence": key_info["confidence"]
                },
                "capo": capo,
                "tuning": detected_tuning,
                "percussion_detected": percussion_detected,
                "techniques_config": percussives or {}
            },
            "analysis": {
                "groove_profile": {
                    "type": groove_info["type"],
                    "swingRatio": groove_info["swingRatio"],
                    "push_drag_tendency": 0.0
                },
                "chord_segments": [],
                "confidence_summary": {
                    "overall": overall_conf,
                    "melodic": overall_conf,
                    "percussive": overall_conf
                }
            },
            "events": {
                "notes": mapped_events,
                "techniques": [],
                "percussion": []
            },
            "tab": {
                "columns": [], # Requires cluster_to_columns adaptation, stubbed for now
                "layers": {"bass": [], "harmony": [], "melody": [], "percussion": []}
            },
            # Internal Debug Hook
            "_debug_artifact_path": am.base_dir,
            "_debug_stats": am.get_debug_metadata(),
            "_debug_stages": stage_diagnostics
        }
        
    except Exception as e:
        # Ensure we return a structured serialization-safe error block instead of letting FastAPI 500 blindly
        response = {
            "error_flag": True,
            "transcription_version": "v2",
            "message": str(e),
            "traceback": traceback.format_exc(),
            "stage_diagnostics": stage_diagnostics,
            "_debug_artifact_path": am.base_dir
        }

    # Robust JSON safety utility
    def _sanitize_for_json(data):
        """Recursively convert all non-JSON-safe types to plain Python primitives."""
        if isinstance(data, dict):
            return {str(k): _sanitize_for_json(v) for k, v in data.items()}
        elif isinstance(data, (list, tuple)):
            return [_sanitize_for_json(v) for v in data]
        elif isinstance(data, set):
            return [_sanitize_for_json(v) for v in sorted(data, key=str)]
        elif isinstance(data, bytes):
            return data.decode('utf-8', errors='replace')
        # numpy ndarray → list
        elif hasattr(data, 'tolist'):
            return _sanitize_for_json(data.tolist())
        # numpy scalar → python scalar
        elif hasattr(data, 'item'):
            val = data.item()
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                return 0.0
            return val
        elif isinstance(data, float):
            if math.isnan(data) or math.isinf(data):
                return 0.0
            return data
        elif isinstance(data, (int, str, bool)) or data is None:
            return data
        # Pydantic models / dataclasses
        elif hasattr(data, 'dict'):
            return _sanitize_for_json(data.dict())
        elif hasattr(data, '__dict__'):
            return _sanitize_for_json(vars(data))
        return str(data)  # Last resort: stringify
        
    try:
        # Write final manifest before returning
        am.save_json_artifact("run_manifest.json", _sanitize_for_json(am.get_debug_metadata()))
    except Exception:
        pass
        
    return _sanitize_for_json(response)
