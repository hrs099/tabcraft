import itertools
from typing import List, Dict, Any
from core.thresholds import config
from .artifact_manager import ArtifactManager

class FretboardMapperV2:
    """
    Phase 3: Ergonomic DP / Viterbi Decoder Engine.
    Maps MIDI pitches to physical string/fret configurations.
    """
    def __init__(self, artifact_manager: ArtifactManager, tuning_list: List[int], capo: int = 0):
        self.am = artifact_manager
        # tuning is low to high in V1 schema semantics
        self.tuning = list(reversed(tuning_list))
        self.num_strings = len(self.tuning)
        self.capo = capo

    def get_candidates(self, pitch: int) -> List[Dict[str, Any]]:
        """Generate all possible (string, fret) pairs for a single pitch, respecting the capo."""
        candidates = []
        for s_idx, open_midi in enumerate(self.tuning):
            # The effective open string pitch is open_midi + capo
            fret = pitch - (open_midi + self.capo)
            
            # We can only play notes at or above the capo
            if 0 <= fret <= (24 - self.capo):
                # Small bonus for playing "open" (which is at the capo position)
                cost = config.mapper.open_string_bonus if fret == 0 else fret * 0.5
                candidates.append({
                    "stringIdx": s_idx,
                    "fretIdx": fret,
                    "cost": cost
                })
        return candidates

    def build_frames(self, melodic_events: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """Cluster notes near-simultaneously to prevent string collisions."""
        frames = []
        current_frame = []
        frame_start = -999.0
        
        for e in melodic_events:
            if e['startTime'] - frame_start <= 0.05:
                current_frame.append(e)
            else:
                if current_frame:
                    frames.append(current_frame)
                current_frame = [e]
                frame_start = e['startTime']
        if current_frame:
            frames.append(current_frame)
        return frames

    def solve_frame_states(self, frame_notes: List[Dict[str, Any]], frame_index: int) -> List[Dict[str, Any]]:
        """
        Generate all valid string/fret state combinations for a chord/frame.
        Ensures NO two notes map to the same string.
        """
        k = len(frame_notes)
        if k == 0: return []
        
        cached_candidates = [self.get_candidates(n['pitch']) for n in frame_notes]
        valid_states = []
        
        # Product of all candidate spaces
        for combination in itertools.product(*cached_candidates):
            # Collision check: no two notes share a string
            assigned_strings = [c["stringIdx"] for c in combination]
            if len(set(assigned_strings)) != len(assigned_strings):
                continue
                
            frets = [c["fretIdx"] for c in combination]
            fretted = [f for f in frets if f > 0] # These are frets RELATIVE to the capo
            
            stretch = max(fretted) - min(fretted) if fretted else 0
            
            # Hard rejection for non-heroic bounds
            if stretch > config.mapper.max_hard_stretch:
                continue
                
            # Barre Heuristic
            is_barre = False
            barre_penalty = 0.0
            if len(fretted) >= 2 and stretch <= config.mapper.max_fret_stretch:
                min_fret = min(fretted)
                min_count = frets.count(min_fret)
                if min_count >= 2 and min_fret > 0:
                    is_barre = True
                    barre_penalty = config.mapper.barre_penalty_base
                    
            # ── Ergonomic Chord Grip Bias ──
            # Favor clusters that fit standard guitar "grips" (≤ 3 fret spread)
            grip_bonus = 0.0
            if len(fretted) >= 2:
                if stretch <= 3:
                    # High bonus for tight, playable clusters (Standard Chord Range)
                    grip_bonus = -8.0 
                elif stretch <= 5:
                    # Moderate bonus for common scale patterns
                    grip_bonus = -3.0
            
            # Distance-from-Nut Penalty (Keep things near the capo/nut for easy play)
            position_penalty = 0.0
            if fretted:
                avg_fret = sum(fretted) / len(fretted)
                if avg_fret > 7:
                    position_penalty = (avg_fret - 7) * 2.0 # Favor lower frets
                
            stretch_penalty = 0.0
            if stretch > config.mapper.max_fret_stretch and not is_barre:
                stretch_penalty = (stretch - config.mapper.max_fret_stretch) * 5.0

            base_sum = sum(c["cost"] for c in combination)
            worst_case_cost = max(c["cost"] for c in combination)
            
            total_local = base_sum + stretch_penalty + barre_penalty + grip_bonus + position_penalty + (worst_case_cost * config.mapper.minimax_worst_case_weight)
            
            anchor_pos = sum(fretted) / len(fretted) if fretted else 0.0
            
            valid_states.append({
                "combination": combination,
                "cost": total_local,
                "anchor": anchor_pos,
                "debug": {
                    "barre_inferred": is_barre,
                    "stretch": stretch,
                    "grip_bonus": grip_bonus
                }
            })
            
        # Beam search clip
        if valid_states:
            valid_states.sort(key=lambda s: s["cost"])
            valid_states = valid_states[:config.mapper.minimax_max_states]
        else:
            # Fallback eagerly to raw greedy string if impossible (bypass collisions locally over throwing 500)
            valid_states.append(self._generate_fallback_state(cached_candidates))
            
        return valid_states

    def _generate_fallback_state(self, cached_candidates: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Greedy lowest-cost bypass for entirely impossible multi-fret jumps."""
        comb = []
        for c_list in cached_candidates:
            if c_list:
                best = min(c_list, key=lambda x: x["cost"])
                comb.append(best)
            else:
                # If no candidate even with capo, we have a pitch error, but we must return something
                comb.append({"stringIdx": 0, "fretIdx": 0, "cost": 999.0})
        
        frets = [x["fretIdx"] for x in comb]
        fretted = [f for f in frets if f > 0]
        anchor = sum(fretted) / len(fretted) if fretted else 0.0
        
        return {
            "combination": comb,
            "cost": 99999.0, # Massive fallback penalty
            "anchor": anchor,
            "debug": { "barre_inferred": False, "stretch": 999, "is_fallback": True }
        }

    def viterbi_decode(self, frames: List[List[Dict[str, Any]]]) -> List[List[Dict[str, Any]]]:
        """Connect frame states using position/anchor shifting penalties."""
        if not frames: return []
        
        V = []
        state_history = []
        
        # Origin
        s0 = self.solve_frame_states(frames[0], 0)
        state_history.append(s0)
        V.append([(s["cost"], None) for s in s0])
        
        # Forward pass
        for t in range(1, len(frames)):
            st = self.solve_frame_states(frames[t], t)
            state_history.append(st)
            
            vt = []
            for t_idx, state_t in enumerate(st):
                best_cost = float('inf')
                best_prev = None
                
                for p_idx, state_prev in enumerate(state_history[t-1]):
                    prev_cost, _ = V[t-1][p_idx]
                    
                    pos_t = state_t["anchor"]
                    pos_prev = state_prev["anchor"]
                    shift = abs(pos_t - pos_prev) if (pos_t > 0 and pos_prev > 0) else 0.0
                    
                    trans_cost = shift * config.mapper.position_shift_penalty
                    
                    total = prev_cost + trans_cost + state_t["cost"]
                    if total < best_cost:
                        best_cost = total
                        best_prev = p_idx
                        
                vt.append((best_cost, best_prev))
            V.append(vt)
            
        # Backtrack
        final_best = min(range(len(V[-1])), key=lambda i: V[-1][i][0])
        optimal_path = []
        curr = final_best
        
        for t in range(len(frames) - 1, -1, -1):
            optimal_path.insert(0, state_history[t][curr])
            curr = V[t][curr][1]
            
        self.am.log_stat("mapper_v2", "total_frames_decoded", len(frames))
        
        for t, state in enumerate(optimal_path):
            comb = state["combination"]
            for i, note in enumerate(frames[t]):
                raw_cands = self.get_candidates(note["pitch"])
                
                alts = []
                for cand in raw_cands:
                    alts.append({
                        "stringIdx": cand["stringIdx"],
                        "fretIdx": cand["fretIdx"],
                        "score": 100.0 / (cand["cost"] + 1e-9)
                    })
                    
                note["stringIdx"] = comb[i]["stringIdx"]
                note["fretIdx"] = comb[i]["fretIdx"]
                note["alternative_positions"] = alts
                
        return frames

def generate_fretboard_mapping(note_events: List[Dict[str, Any]], tuning_list: List[int], am: ArtifactManager) -> List[Dict[str, Any]]:
    """
    Root dispatch mapping Phase 3 logic onto events.
    Updated: Enforces 2-4 octave compression and Ergonomic Chord Grip Bias.
    """
    melodic = [ev for ev in note_events if ev.get("type", "melodic") != "percussion"]
    
    for ev in note_events:
        if ev.get("type", "melodic") == "percussion":
            ev["stringIdx"] = "perc"
            ev["fretIdx"] = None
            ev["alternative_positions"] = []
            
    if not melodic: return note_events
    
    melodic.sort(key=lambda x: x["startTime"])
    
    # ── Octave Compression (2-4 Octave Constraint) ──────────────────────────
    # User requested 2-3 octaves, max 4. We shift notes to fit this "Playable Range".
    pitches = [e['pitch'] for e in melodic]
    if pitches:
        median_pitch = sorted(pitches)[len(pitches)//2]
        # Target range: ±18 semitones from median (~3 octaves)
        for ev in melodic:
            p = ev['pitch']
            diff = p - median_pitch
            if diff > 24: # Too high
                ev['pitch'] -= 12
                ev['_debug_shifted'] = "down"
            elif diff < -12: # Too low
                ev['pitch'] += 12
                ev['_debug_shifted'] = "up"

    # ── Heuristic Capo & Tuning Optimization ──────────────────────────────────
    tuning = list(reversed(tuning_list))
    best_capo = 0
    min_avg_fret = 999.0
    
    # Check capos 0-7. We want the one that puts the MOST notes in the "Sweet Spot" (frets 0-5)
    for c_test in range(0, 8):
        total_fret = 0
        count = 0
        for p in [e['pitch'] for e in melodic]:
            # Find the lowest fret for this pitch at this capo
            cands = []
            for open_m in tuning:
                f = p - (open_m + c_test)
                if 0 <= f <= 20: cands.append(f)
            
            if cands:
                total_fret += min(cands)
                count += 1
        
        if count > 0:
            avg = total_fret / count
            if avg < min_avg_fret:
                min_avg_fret = avg
                best_capo = c_test

    am.log_stat("mapper_v2", "optimized_capo", best_capo)
    
    mapper = FretboardMapperV2(am, tuning_list, capo=best_capo)
    frames = mapper.build_frames(melodic)
    
    # DP Pass with Chord Grip Bias
    mapper.viterbi_decode(frames)
    
    for e in note_events:
        e['capo'] = best_capo
        
    return note_events
