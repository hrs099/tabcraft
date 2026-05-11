"""
main.py - Astra Transcription API
Structured fatal error telemetry.
"""
import json, logging, math, os, shutil, tempfile, traceback
from typing import Any, Optional
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from transcription.pipeline import process_audio
from transcription.pipeline_v2 import process_audio_v2
from transcription.schemas import TranscriptionResponse, TranscriptionResponseV2

def _deep_sanitize(data: Any) -> Any:
    if isinstance(data, dict): return {str(k): _deep_sanitize(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple)): return [_deep_sanitize(v) for v in data]
    elif isinstance(data, set): return [_deep_sanitize(v) for v in sorted(data, key=str)]
    elif isinstance(data, bytes): return data.decode('utf-8', errors='replace')
    elif hasattr(data, 'tolist'): return _deep_sanitize(data.tolist())
    elif hasattr(data, 'item'):
        val = data.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)): return 0.0
        return val
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data): return 0.0
        return data
    elif isinstance(data, (int, str, bool)) or data is None: return data
    elif hasattr(data, 'dict'): return _deep_sanitize(data.dict())
    return str(data)

class NumpySafeJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return super().render(_deep_sanitize(content))

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(name)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger("astra.pipeline")

app = FastAPI(title="Astra Transcription API", description="Fingerstyle Guitar Intelligence Engine", version="2.0.0")

import os as _os
_raw_origins = _os.environ.get("ALLOWED_ORIGINS", "")
_allowed_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()] if _raw_origins else ["*"]
app.add_middleware(CORSMiddleware, allow_origins=_allowed_origins, allow_credentials=False if "*" in _allowed_origins else True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}

@app.post("/api/v2/transcribe", response_class=NumpySafeJSONResponse)
async def transcribe_v2(file: UploadFile = File(...), tuning: Optional[str] = Form(None), percussives: Optional[str] = Form(None)):
    tuning_list = [40, 45, 50, 55, 59, 64]
    if tuning:
        try:
            parsed = json.loads(tuning)
            if isinstance(parsed, list) and len(parsed) == 6: tuning_list = [int(n) for n in parsed]
        except json.JSONDecodeError: pass
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    retained_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(retained_dir, exist_ok=True)
    import binascii; safe_filename = f"{binascii.hexlify(os.urandom(4)).decode()}_{file.filename}"
    tmp_path = os.path.join(retained_dir, safe_filename)
    try:
        with open(tmp_path, "wb") as tmp: shutil.copyfileobj(file.file, tmp)
        logger.info("V2 Pipeline started  file=%s", file.filename)
        perc_dict = {}
        if percussives:
            try:
                parsed_perc = json.loads(percussives)
                if isinstance(parsed_perc, dict): perc_dict = parsed_perc
            except json.JSONDecodeError: pass
        result = process_audio_v2(tmp_path, tuning_list, perc_dict)
        if result.get("error_flag"): raise HTTPException(status_code=500, detail=result)
        return result
    except HTTPException: raise
    except Exception as exc:
        tb_str = traceback.format_exc()
        logger.error("[FATAL] V2 Pipeline crash\n%s", tb_str)
        raise HTTPException(status_code=500, detail={"error": type(exc).__name__, "message": str(exc), "traceback": tb_str})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                debug_mode = os.environ.get("ASTRA_DEBUG_RETAIN", "true").lower() == "true"
                if not debug_mode: os.unlink(tmp_path)
                else: logger.info("Retained audio artifact: %s", tmp_path)
            except OSError: pass

@app.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...), tuning: Optional[str] = Form(None), onset_threshold: Optional[float] = Form(0.5), frame_threshold: Optional[float] = Form(0.3), suggest_groove: Optional[bool] = Form(False)):
    tuning_list = [40, 45, 50, 55, 59, 64]
    if tuning:
        try:
            parsed = json.loads(tuning)
            if isinstance(parsed, list) and len(parsed) == 6 and all(isinstance(n, (int, float)) for n in parsed): tuning_list = [int(n) for n in parsed]
            else: logger.warning("Invalid tuning payload (%s)", tuning)
        except json.JSONDecodeError: logger.warning("Tuning JSON parse failed (%s)", tuning)
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp); tmp_path = tmp.name
        logger.info("Transcription started  file=%s  tuning=%s", file.filename, tuning_list)
        result = process_audio(tmp_path, tuning_list, suggest_groove=bool(suggest_groove))
        logger.info("Transcription complete  notes=%d  columns=%d", len(result.get("notes", [])), len(result.get("columns", [])))
        return result
    except Exception as exc:
        tb_str = traceback.format_exc()
        logger.error("[FATAL] Pipeline crash on file=%s\n%s", file.filename, tb_str)
        raise HTTPException(status_code=500, detail={"error": type(exc).__name__, "message": str(exc), "traceback": tb_str})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                debug_mode = os.environ.get("ASTRA_DEBUG_RETAIN", "true").lower() == "true"
                if not debug_mode: os.unlink(tmp_path)
                else: logger.info("Retained V1 artifact: %s", tmp_path)
            except OSError: pass
