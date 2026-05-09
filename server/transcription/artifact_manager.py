import os
import uuid
import json
import logging
import tempfile
from typing import Any, Dict

logger = logging.getLogger("astra.artifacts")

class ArtifactManager:
    """
    Manages intermediate artifacts and debug stats for a single transcription run.
    Uses a UUID-based session architecture.
    """
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            default_dir = os.path.join(tempfile.gettempdir(), "astra_runs")
            base_dir = os.environ.get("ASTRA_ARTIFACT_DIR", default_dir)
            
        self.run_id = str(uuid.uuid4())
        self.base_dir = os.path.join(base_dir, self.run_id)
        self.metadata: Dict[str, Any] = {}
        
        try:
            os.makedirs(self.base_dir, exist_ok=True)
            logger.info("ArtifactManager initialized session: %s", self.base_dir)
        except OSError as e:
            logger.warning("Could not create artifact directory %s: %s", self.base_dir, e)

    def log_stat(self, stage: str, key: str, value: Any):
        """Log a structured stat to memory."""
        if stage not in self.metadata:
            self.metadata[stage] = {}
        self.metadata[stage][key] = value

    def save_json_artifact(self, filename: str, data: Any):
        """Persist a JSON artifact to disk for deep debugging."""
        path = os.path.join(self.base_dir, filename)
        
        def _sanitize_for_json(d):
            if isinstance(d, dict):
                return {k: _sanitize_for_json(v) for k, v in d.items()}
            elif isinstance(d, (list, tuple)):
                return [_sanitize_for_json(v) for v in d]
            elif hasattr(d, 'item'): 
                return d.item()
            return d
            
        try:
            with open(path, "w") as f:
                json.dump(_sanitize_for_json(data), f, indent=2)
        except OSError as e:
            logger.warning("Failed to save artifact %s: %s", filename, e)
        except TypeError as e:
            logger.warning("Failed to serialize artifact %s: %s", filename, e)
            
    def get_debug_metadata(self) -> Dict[str, Any]:
        """Return the collected statistics."""
        return self.metadata

