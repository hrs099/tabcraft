import itertools

def map_to_guitar(note_events, tuning_list):
    """
    Phase 3: Map MIDI pitches to guitar string/fret positions utilizing a 
    Viterbi dynamic programming pathfinder for ergonomic string mapping.
    
    - Dynamically adapts to complex intervals in non-standard tunings.
    - Heavily penalizes impossible stretches (> 5 frets).
    - Penalizes position shifts to encourage anchored hand positions.
    - Ensures polyphonic overlap notes are assigned to distinct strings.
    """
    # tuning_list from backend is low->high. Target strings index 0 is high string.
    playing_tuning = list(reversed(tuning_list))
    NUM_STRINGS = len(playing_tuning)
    
    melodic_events = []
    
    # 1. Isolate and pass through percussive events
    for event in note_events:
        if event['type'] == 'percussion':
            event['stringIdx'] = 'perc'
            event['fretIdx'] = None
        else:
            melodic_events.append(event)
            
    if not melodic_events:
        return note_events
        
    # Sort chronologically
    melodic_events.sort(key=lambda x: x['startTime'])
    
    # 2. Group notes into temporal clusters (frames) using 50ms onset windows
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
        
    # 3. State space generator for a single frame
    def get_valid_states(frame):
        k = len(frame)
        subset_k = min(k, NUM_STRINGS)
        
        valid_states = []
        
        # itertools.permutations perfectly maps concurrent notes to entirely distinct 
        # strings, solving polyphonic data loss.
        for string_assignment in itertools.permutations(range(NUM_STRINGS), subset_k):
            frets = []
            is_valid = True
            fretted_notes = []
            
            for i in range(subset_k):
                pitch = frame[i]['pitch']
                s_idx = string_assignment[i]
                fret = pitch - playing_tuning[s_idx]
                
                # Filter out impossible geometries (negative frets or >24)
                if fret < 0 or fret > 24:
                    is_valid = False
                    break
                    
                frets.append(fret)
                if fret > 0:
                    fretted_notes.append(fret)
                    
            if not is_valid:
                continue
                
            stretch = max(fretted_notes) - min(fretted_notes) if fretted_notes else 0
            
            # Massive penalty for non-ergonomic physical stretches (> 5 frets)
            if stretch > 5:
                stretch_cost = 1000.0 * (stretch - 5)
            else:
                stretch_cost = stretch * 2.0
                
            # Base positional preference: slightly bias towards lower frets physically
            fret_cost = sum(frets) * 0.5
            
            # Estimate physical hand anchor point for this chord
            pos = sum(fretted_notes) / len(fretted_notes) if fretted_notes else 0.0
            
            valid_states.append({
                'assignment': string_assignment,
                'frets': tuple(frets),
                'cost': stretch_cost + fret_cost,
                'pos': pos
            })
            
        # Sort and apply Beam Search crop to prevent O(T*N^2) state explosion
        if len(valid_states) > 64:
            valid_states.sort(key=lambda x: x['cost'])
            valid_states = valid_states[:64]
            
        # Failsafe: If basic-pitch hallucinates an impossible physical chord, fallback eagerly
        if not valid_states:
            assignment = []
            frets = []
            for note in frame[:subset_k]:
                best_s = 0
                best_f = 999
                for s_idx, open_midi in enumerate(playing_tuning):
                    f = note['pitch'] - open_midi
                    if 0 <= f <= 24 and f < best_f:
                        best_f = f
                        best_s = s_idx
                assignment.append(best_s)
                frets.append(best_f if best_f != 999 else 0)
                
            fretted = [f for f in frets if f > 0]
            pos = sum(fretted) / len(fretted) if fretted else 0.0
            valid_states.append({
                'assignment': tuple(assignment),
                'frets': tuple(frets),
                'cost': 99999.0, # Flag as penalized
                'pos': pos
            })
            
        return valid_states

    # 4. Viterbi Dynamic Programming Engine
    V = []
    
    # Initialize origin states
    states_0 = get_valid_states(frames[0])
    V.append([(s['cost'], None) for s in states_0])
    state_history = [states_0]
    
    # Forward pass
    for t in range(1, len(frames)):
        states_t = get_valid_states(frames[t])
        state_history.append(states_t)
        
        v_t = []
        for state_t in states_t:
            best_cost = float('inf')
            best_prev_idx = None
            
            for s_prev_idx, state_prev in enumerate(state_history[t-1]):
                prev_cost, _ = V[t-1][s_prev_idx]
                
                pos_t = state_t['pos']
                pos_prev = state_prev['pos']
                
                # Check absolute neck shift
                if pos_t > 0 and pos_prev > 0:
                    shift = abs(pos_t - pos_prev)
                else:
                    shift = 0 # Moving from/to an open-string doesn't strongly displace anchor
                    
                # Penalize position shifting 
                transition_cost = shift * 3.0
                
                total_cost = prev_cost + transition_cost + state_t['cost']
                
                if total_cost < best_cost:
                    best_cost = total_cost
                    best_prev_idx = s_prev_idx
                    
            v_t.append((best_cost, best_prev_idx))
            
        V.append(v_t)
        
    # 5. Backtrack reverse lookup
    best_final_idx = min(range(len(V[-1])), key=lambda i: V[-1][i][0])
    
    optimal_path = []
    curr_idx = best_final_idx
    
    for t in range(len(frames) - 1, -1, -1):
        optimal_path.insert(0, state_history[t][curr_idx])
        curr_idx = V[t][curr_idx][1]
        
    # 6. Apply optimal state path destructively onto memory objects
    for t, state in enumerate(optimal_path):
        frame = frames[t]
        subset_k = len(state['assignment'])
        
        for i in range(subset_k):
            frame[i]['stringIdx'] = state['assignment'][i]
            frame[i]['fretIdx'] = state['frets'][i]
            
        # Greedy clean-up for the fractional % case of >6 simultaneous pitch detections
        if len(frame) > subset_k:
            for i in range(subset_k, len(frame)):
                pitch = frame[i]['pitch']
                best_s = 0
                best_f = 999
                for s_idx, open_midi in enumerate(playing_tuning):
                    f = pitch - open_midi
                    if 0 <= f <= 24 and f < best_f:
                        best_f = f
                        best_s = s_idx
                frame[i]['stringIdx'] = best_s
                frame[i]['fretIdx'] = best_f if best_f != 999 else 0

    # ── Automatic Capo Inference ───────────────────────────────────────────────
    # Collect all fretted (non-zero) fret positions across melodic events only.
    # Percussive hits (stringIdx == 'perc') are explicitly excluded.
    fretted_positions = [
        e['fretIdx']
        for e in note_events
        if e.get('type') != 'percussion'
        and isinstance(e.get('fretIdx'), int)
        and e['fretIdx'] > 0
    ]

    capo = 0  # Default: no capo
    if fretted_positions:
        global_min_fret = min(fretted_positions)
        if global_min_fret > 0:
            # Shift every melodic fretIdx down by the capo offset and record it
            capo = global_min_fret
            for e in note_events:
                if (
                    e.get('type') != 'percussion'
                    and isinstance(e.get('fretIdx'), int)
                ):
                    e['fretIdx'] = e['fretIdx'] - capo

    # Attach capo value to each event so pipeline.py can forward it in metadata
    for e in note_events:
        e['capo'] = capo

    return note_events
