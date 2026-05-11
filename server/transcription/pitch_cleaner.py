"""
pitch_cleaner.py — Stage 3: Post-extraction note cleanup.

Improvements over original:
  1. Merges fragmented notes with same pitch within a wider gap tolerance
  2. Removes very short "ghost" notes that survived pitch extraction
  3. Filters out low-confidence notes that create "buzzy" artifacts
  4. Removes octave-duplicate shadows (e.g., when both E2 and E3 fire
     simultaneously from overtones)
  5. Normalises confidence to [0.5, 1.0] range for downstream display
"""

from typing import List, Dict, Any
import numpy as np
from .artifact_manager import ArtifactManager


# ── Quality gates ────────────────────────────────────────────────────────────
MIN_DURATION_SEC = 0.07        # Notes shorter than 70 ms are likely artifacts
MIN_CONFIDENCE = 0.15          # Absolute floor — notes below this are noise
MERGE_GAP_TOLERANCE = 0.08     # Max gap (sec) to merge same-pitch fragments
OCTAVE_SHADOW_WINDOW = 0.05    # Time window to check for octave duplicates


class PitchCleaner:
    """Stage 3: Pitch Cleanup — aggressive ghost-note suppression."""

    def __init__(self, artifact_manager: ArtifactManager):
        self.am = artifact_manager

    def clean(self, raw_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        self.am.log_stat("pitch", "raw_event_count", len(raw_events))

        if not raw_events:
            return []

        sorted_events = sorted(raw_events, key=lambda x: x["startTime"])
        merged = self._merge_fragments(sorted_events)
        self.am.log_stat("pitch", "after_merge_count", len(merged))

        merged = [e for e in merged if e["duration"] >= MIN_DURATION_SEC]
        self.am.log_stat("pitch", "after_duration_filter", len(merged))

        merged = [
            e for e in merged
            if e.get("raw_confidence", e.get("confidence", 0.5)) >= MIN_CONFIDENCE
        ]
        self.am.log_stat("pitch", "after_confidence_filter", len(merged))

        merged = self._remove_octave_shadows(merged)
        self.am.log_stat("pitch", "after_octave_dedup", len(merged))

        self._normalise_confidence(merged)

        self.am.log_stat("pitch", "cleaned_event_count", len(merged))
        self.am.save_json_artifact("pitch_refined.json", merged)
        return merged

    def _merge_fragments(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not events:
            return []
        cleaned = []
        for event in events:
            if "confidence" in event and "raw_confidence" not in event:
                event["raw_confidence"] = event.pop("confidence")
            if not cleaned:
                cleaned.append(event)
                continue
            prev = cleaned[-1]
            prev_end = prev["startTime"] + prev["duration"]
            gap = event["startTime"] - prev_end
            same_pitch = prev["pitch"] == event["pitch"]
            if same_pitch and gap < MERGE_GAP_TOLERANCE:
                new_end = max(prev_end, event["startTime"] + event["duration"])
                prev["duration"] = new_end - prev["startTime"]
                raw_c_event = event.get("raw_confidence", event.get("confidence", 0.5))
                prev["raw_confidence"] = max(prev.get("raw_confidence", 0.5), raw_c_event)
                prev["amplitude"] = max(prev.get("amplitude", 0), event.get("amplitude", 0))
            else:
                cleaned.append(event)
        return cleaned

    def _remove_octave_shadows(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if len(events) < 2:
            return events
        to_remove = set()
        for i, ev_a in enumerate(events):
            if i in to_remove:
                continue
            for j in range(i + 1, len(events)):
                if j in to_remove:
                    continue
                ev_b = events[j]
                if ev_b["startTime"] - ev_a["startTime"] > OCTAVE_SHADOW_WINDOW:
                    break
                pitch_diff = abs(ev_a["pitch"] - ev_b["pitch"])
                if pitch_diff == 12:
                    conf_a = ev_a.get("raw_confidence", 0.5)
                    conf_b = ev_b.get("raw_confidence", 0.5)
                    if conf_a >= conf_b:
                        to_remove.add(j)
                    else:
                        to_remove.add(i)
                        break
        return [ev for i, ev in enumerate(events) if i not in to_remove]

    def _normalise_confidence(self, events: List[Dict[str, Any]]) -> None:
        if not events:
            return
        conf_scores = [e.get("raw_confidence", 0.5) for e in events]
        c_min, c_max = min(conf_scores), max(conf_scores)
        for e in events:
            raw = e.get("raw_confidence", c_min)
            if c_max > c_min:
                normalised = (raw - c_min) / (c_max - c_min)
                e["normalized_confidence"] = 0.5 + (0.5 * normalised)
            else:
                e["normalized_confidence"] = 0.85
