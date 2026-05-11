import itertools
from typing import List, Dict, Any
from core.thresholds import config
from .artifact_manager import ArtifactManager

class FretboardMapperV2:
    def __init__(self, artifact_manager: ArtifactManager, tuning_list: List[int], capo: int = 0):
        self.am = artifact_manager
        self.tuning = list(reversed(tuning_list))
        self.num_strings = len(self.tuning)
        self.capo = capo

    def get_candidates(self, pitch: int) -> List[Dict[str, Any]]:
        candidates = []
        for s_idx, open_midi in enumerate(self.tuning):
            fret = pitch - (open_midi + self.capo)
            if 0 <= fret <= (24 - self.capo):
                cost = config.mapper.open_string_bonus if fret == 0 else fret * 0.5
                candidates.append({"stringIdx": s_idx, "fretIdx": fret, "cost": cost})
        return candidates

    def build_frames(self, melodic_events: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        frames = []
        current_frame = []
        frame_start = -999.0
        for e in melodic_events:
            if e['startTime'] - frame_start <= 0.05:
                current_frame.append(e)
            else:
                if current_frame: frames.append(current_frame)
                current_frame = [e]
                frame_start = e['startTime']
        if current_frame: frames.append(current_frame)
        return frames

    def solve_frame_states(self, frame_notes, frame_index):
        k = len(frame_notes)
        if k == 0: return []
        cached_candidates = [self.get_candidates(n['pitch']) for n in frame_notes]
        valid_states = []
        for combination in itertools.product(*cached_candidates):
            assigned_strings = [c["stringIdx"] for c in combination]
            if len(set(assigned_strings)) != len(assigned_strings): continue
            frets = [c["fretIdx"] for c in combination]
            fretted = [f for f in frets if f > 0]
            stretch = max(fretted) - min(fretted) if fretted else 0
            if stretch > config.mapper.max_hard_stretch: continue
            is_barre = False
            barre_penalty = 0.0
            if len(fretted) >= 2 and stretch <= config.mapper.max_fret_stretch:
                min_fret = min(fretted)
                if frets.count(min_fret) >= 2 and min_fret > 0:
                    is_barre = True
                    barre_penalty = config.mapper.barre_penalty_base
            grip_bonus = 0.0
            if len(fretted) >= 2:
                if stretch <= 3: grip_bonus = -8.0
                elif stretch <= 5: grip_bonus = -3.0
            position_penalty = 0.0
            if fretted:
                avg_fret = sum(fretted) / len(fretted)
                if avg_fret > 7: position_penalty = (avg_fret - 7) * 2.0
            stretch_penalty = 0.0
            if stretch > config.mapper.max_fret_stretch and not is_barre:
                stretch_penalty = (stretch - config.mapper.max_fret_stretch) * 5.0
            base_sum = sum(c["cost"] for c in combination)
            worst_case_cost = max(c["cost"] for c in combination)
            total_local = base_sum + stretch_penalty + barre_penalty + grip_bonus + position_penalty + (worst_case_cost * config.mapper.minimax_worst_case_weight)
            anchor_pos = sum(fretted) / len(fretted) if fretted else 0.0
            valid_states.append({"combination": combination, "cost": total_local, "anchor": anchor_pos, "debug": {"barre_inferred": is_barre, "stretch": stretch, "grip_bonus": grip_bonus}})
        if valid_states:
            valid_states.sort(key=lambda s: s["cost"])
            valid_states = valid_states[:config.mapper.minimax_max_states]
        else:
            valid_states.append(self._generate_fallback_state(cached_candidates))
        return valid_states

    def _generate_fallback_state(self, cached_candidates):
        comb = []
        for c_list in cached_candidates:
            if c_list: comb.append(min(c_list, key=lambda x: x["cost"]))
            else: comb.append({"stringIdx": 0, "fretIdx": 0, "cost": 999.0})
        frets = [x["fretIdx"] for x in comb]
        fretted = [f for f in frets if f > 0]
        anchor = sum(fretted) / len(fretted) if fretted else 0.0
        return {"combination": comb, "cost": 99999.0, "anchor": anchor, "debug": {"barre_inferred": False, "stretch": 999, "is_fallback": True}}

    def viterbi_decode(self, frames):
        if not frames: return []
        V = []
        state_history = []
        s0 = self.solve_frame_states(frames[0], 0)
        state_history.append(s0)
        V.append([(s["cost"], None) for s in s0])
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
                raw_cands = self.get_candidates(note['pitch'])
                alts = [{"stringIdx": cand["stringIdx"], "fretIdx": cand["fretIdx"], "score": 100.0 / (cand["cost"] + 1e-9)} for cand in raw_cands]
                note["stringIdx"] = comb[i]["stringIdx"]
                note["fretIdx"] = comb[i]["fretIdx"]
                note["alternative_positions"] = alts
        return frames

def generate_fretboard_mapping(note_events, tuning_list, am):
    melodic = [ev for ev in note_events if ev.get("type", "melodic") != "percussion"]
    for ev in note_events:
        if ev.get("type", "melodic") == "percussion":
            ev["stringIdx"] = "perc"
            ev["fretIdx"] = None
            ev["alternative_positions"] = []
    if not melodic: return note_events
    melodic.sort(key=lambda x: x["startTime"])
    pitches = [e['pitch'] for e in melodic]
    if pitches:
        median_pitch = sorted(pitches)[len(pitches)//2]
        for ev in melodic:
            p = ev['pitch']
            diff = p - median_pitch
            if diff > 24: ev['pitch'] -= 12; ev['_debug_shifted'] = "down"
            elif diff < -12: ev['pitch'] += 12; ev['_debug_shifted'] = "up"
    tuning = list(reversed(tuning_list))
    best_capo = 0
    min_avg_fret = 999.0
    for c_test in range(0, 8):
        total_fret = 0
        count = 0
        for p in [e['pitch'] for e in melodic]:
            cands = []
            for open_m in tuning:
                f = p - (open_m + c_test)
                if 0 <= f <= 20: cands.append(f)
            if cands: total_fret += min(cands); count += 1
        if count > 0:
            avg = total_fret / count
            if avg < min_avg_fret: min_avg_fret = avg; best_capo = c_test
    am.log_stat("mapper_v2", "optimized_capo", best_capo)
    mapper = FretboardMapperV2(am, tuning_list, capo=best_capo)
    frames = mapper.build_frames(melodic)
    mapper.viterbi_decode(frames)
    for e in note_events: e['capo'] = best_capo
    return note_events
