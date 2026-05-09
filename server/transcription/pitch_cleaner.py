from typing import List, Dict, Any
import numpy as np
from .artifact_manager import ArtifactManager

class PitchCleaner:
    """Stage 3: Pitch Cleanup."""
    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def clean(self, raw_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Merges fragmented notes, deduplicates near-identical overlapping events,
        and normalizes confidence consistently.
        """
        self.am.log_stat("pitch", "raw_event_count", len(raw_events))
        
        if not raw_events:
            return []
            
        # 1. Sort by start time
        sorted_events = sorted(raw_events, key=lambda x: x["startTime"])
        
        cleaned = []
        for event in sorted_events:
            if not cleaned:
                if "confidence" in event:
                    event["raw_confidence"] = event.pop("confidence")
                cleaned.append(event)
                continue
                
            prev = cleaned[-1]
            
            # Check for overlap + same pitch
            overlap = (prev["startTime"] + prev["duration"]) - event["startTime"]
            same_pitch = prev["pitch"] == event["pitch"]
            
            if same_pitch and overlap > -0.05: # Merge slightly gapped or overlapping notes
                # Merge logic
                new_start = prev["startTime"]
                end_a = prev["startTime"] + prev["duration"]
                end_b = event["startTime"] + event["duration"]
                new_end = max(end_a, end_b)
                
                prev["duration"] = new_end - new_start
                # Preserve raw detector confidence vs refined confidence
                if "raw_confidence" not in prev:
                    prev["raw_confidence"] = prev.pop("confidence", 0.5)
                    
                raw_c_event = event.pop("confidence", 0.5)
                # Max raw confidence
                prev["raw_confidence"] = max(prev["raw_confidence"], raw_c_event)
            else:
                if "confidence" in event:
                    event["raw_confidence"] = event.pop("confidence")
                cleaned.append(event)
                
        # Normalization of confidence to [0, 1] range via MinMax
        conf_scores = [c["raw_confidence"] for c in cleaned if "raw_confidence" in c]
        if conf_scores:
            c_min, c_max = min(conf_scores), max(conf_scores)
            for c in cleaned:
                if c_max > c_min:
                    raw = c.get("raw_confidence", c_min)
                    normalized = (raw - c_min) / (c_max - c_min)
                    c["normalized_confidence"] = 0.5 + (0.5 * normalized) # Scale to [0.5, 1.0] to represent minimum viable 
                else:
                    c["normalized_confidence"] = 0.85 # fallback
                    
        self.am.log_stat("pitch", "cleaned_event_count", len(cleaned))
        
        # Save pitch debug artifact
        self.am.save_json_artifact("pitch_refined.json", cleaned)
        return cleaned
