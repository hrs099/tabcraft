import { SCALES, TUNINGS, NOTE_NAMES, getRootMidiFromName, HARMONIC_NODES } from './music';

/**
 * All percussion label codes for the dedicated Perc row
 */
export const TECHNIQUE_REGISTRY = {
  'Kick Drum (Wrist)':    { label: 'K', type: 'percussive', allowedWithStrings: true, skipReason: null },
  'Snare (Thumb Slap)':   { label: 'S', type: 'percussive', allowedWithStrings: false, skipReason: 'Strings muted by slap' },
  'String Slap':          { label: 'X', type: 'percussive', allowedWithStrings: false, skipReason: 'Strings muted by slap' },
  'Body Tap':             { label: 'T', type: 'percussive', allowedWithStrings: true, skipReason: null },
  'Nail Attack':          { label: 'N', type: 'percussive', allowedWithStrings: true, skipReason: null },
  'Advanced Harmonics':   { label: 'AH', type: 'harmonic', allowedWithStrings: false, skipReason: 'Occupies fretting hand' },
  'Artificial Harmonics': { label: 'ArH', type: 'harmonic', allowedWithStrings: false, skipReason: 'Occupies plucking hand fully' },
  '2-Hand Tapping':       { label: '2T', type: 'tapping', allowedWithStrings: false, skipReason: 'Requires both hands' }
};

export const PERC_LABELS = Object.fromEntries(
  Object.entries(TECHNIQUE_REGISTRY).map(([k, v]) => [k, v.label])
);

/**
 * Style presets — bias the generation parameters toward a specific artist's feel.
 */
export const STYLE_PRESETS = {
  'Andy McKee':        { scaleName: 'DADGAD', rootName: 'D', complexity: 4, mood: 'Melodic',    percussiveTechs: ['Body Tap', 'String Slap', 'Advanced Harmonics'] },
  'Don Ross':          { scaleName: 'Dorian', rootName: 'A', complexity: 5, mood: 'Aggressive', percussiveTechs: ['Kick Drum (Wrist)', 'Snare (Thumb Slap)', '2-Hand Tapping'] },
  'Antoine Dufour':    { scaleName: 'Major',  rootName: 'G', complexity: 4, mood: 'Emotional',  percussiveTechs: ['Body Tap', 'Nail Attack', 'Artificial Harmonics'] },
  'Tommy Emmanuel':    { scaleName: 'Major',  rootName: 'C', complexity: 5, mood: 'Playful',    percussiveTechs: ['String Slap', 'Nail Attack', '2-Hand Tapping'] },
  'Michael Hedges':    { scaleName: 'DADGAD', rootName: 'D', complexity: 5, mood: 'Calm',       percussiveTechs: ['Advanced Harmonics', 'Artificial Harmonics', 'Body Tap'] },
  'Sungha Jung':       { scaleName: 'Major',  rootName: 'C', complexity: 3, mood: 'Melodic',    percussiveTechs: ['Body Tap', 'String Slap'] },
  'Leo Kottke':        { scaleName: 'Blues',  rootName: 'G', complexity: 4, mood: 'Playful',    percussiveTechs: ['Kick Drum (Wrist)', 'Snare (Thumb Slap)'] },
};

export function generateSolo(params) {
  const { 
    scaleName = 'Major', 
    rootName = 'C', 
    mood = 'Calm', 
    complexity = 1, 
    percussiveTechs = [],
    tuningKey = 'Standard',
    forceHarmonicNodes = false,
    chordProgression = [],  // array of root note names e.g. ['C','F','G','Am']
  } = params;

  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  const rootMidiOffset = getRootMidiFromName(rootName);
  const intervals = SCALES[scaleName] || SCALES.Major;
  const harmonicFrets = new Set(HARMONIC_NODES.map(n => n.fret));
  
  // Build a pool of all in-scale notes across frets 0–14
  const playableNotes = [];
  tuning.forEach((openMidi, stringIdx) => {
    for (let fretIdx = 0; fretIdx <= 14; fretIdx++) {
      const midi = openMidi + fretIdx;
      const normalizedMidi = midi % 12;
      const noteInterval = (normalizedMidi - rootMidiOffset + 12) % 12;
      if (intervals.includes(noteInterval)) {
         playableNotes.push({ stringIdx, fretIdx, midi, noteInterval });
      }
    }
  });

  // Harmonic node notes (for forceHarmonicNodes mode)
  const harmonicNotes = playableNotes.filter(n => harmonicFrets.has(n.fretIdx));

  const bassNotes = playableNotes.filter(n => n.stringIdx >= 3 && (n.noteInterval === 0 || n.noteInterval === 7));
  const melodyNotes = playableNotes.filter(n => n.stringIdx <= 2);

  // Chord progression target notes (root + 3rd + 5th)
  let chordTargetSets = [];
  if (chordProgression.length > 0) {
    chordTargetSets = chordProgression.map(rootN => {
      const rIdx = NOTE_NAMES.indexOf(rootN);
      return new Set([rIdx % 12, (rIdx + 4) % 12, (rIdx + 7) % 12]);
    });
  }

  const length = Math.floor(Math.random() * (32 - 16 + 1)) + 16;
  let columns = [];
  
  // Techniques Pool based on Mood
  const techniquesPool = [];
  if (mood === 'Calm')       techniquesPool.push('s', 'harm'); 
  else if (mood === 'Aggressive') techniquesPool.push('h', 'p', 'b'); 
  else if (mood === 'Emotional')  techniquesPool.push('v', 'p', 's'); 
  else if (mood === 'Playful')    techniquesPool.push('g', 't', 'h'); 
  else techniquesPool.push('h', 's');

  // Add advanced techniques to pool based on selected percussiveTechs
  if (percussiveTechs.includes('Advanced Harmonics'))   techniquesPool.push('adv_harm');
  if (percussiveTechs.includes('Artificial Harmonics')) techniquesPool.push('art_harm');
  if (percussiveTechs.includes('2-Hand Tapping'))       techniquesPool.push('2tap');

  // Generate a melodic phrase of N columns
  const generatePhrase = (len, allowChords, allowTech, chordTargetSet) => {
     let phrase = [];
     let baseFret = null;
     for(let i=0; i<len; i++) {
        let colNotes = [];
        let numNotes = allowChords ? (Math.random() > 0.5 ? Math.min(complexity, 4) : 1) : 1;
        let attempts = 0;

        // Use harmonic note pool when forcing harmonic nodes
        let notePool = forceHarmonicNodes && harmonicNotes.length > 0
          ? Math.random() > 0.4 ? harmonicNotes : melodyNotes
          : melodyNotes;
        
        // Filter note pool to chord target tones if chord progression is active
        let filteredPool = notePool;
        if (chordTargetSet && chordTargetSet.size > 0) {
          const chord_filtered = notePool.filter(n => chordTargetSet.has(n.midi % 12));
          if (chord_filtered.length > 2) filteredPool = chord_filtered;
        }
        
        while(colNotes.length < numNotes && attempts < 30) {
           const candidate = filteredPool[Math.floor(Math.random() * filteredPool.length)];
           if (!candidate) { attempts++; continue; }
           if (colNotes.some(n => n.stringIdx === candidate.stringIdx)) { attempts++; continue; }
           
           if (baseFret === null && candidate.fretIdx !== 0) baseFret = candidate.fretIdx;
           if (baseFret !== null && candidate.fretIdx !== 0 && Math.abs(candidate.fretIdx - baseFret) > 4) {
               attempts++; continue;
           }

           let tech = ''; let techLabel = '';
           if (allowTech && candidate.fretIdx !== 0 && Math.random() < 0.3 && techniquesPool.length > 0) {
               let mapped = techniquesPool[Math.floor(Math.random() * techniquesPool.length)];
               if (mapped === 'harm' || mapped === 'adv_harm') {
                   if ([5, 7, 12, 19, 24].includes(candidate.fretIdx)) tech = '<>';
               } else if (mapped === 'art_harm') {
                   tech = '<>'; techLabel = 'AH';
               } else if (mapped === '2tap') {
                   techLabel = '2T';
               } else if (mapped === 'b') techLabel = 'b';
               else if (['h', 'p', 's'].includes(mapped)) techLabel = mapped;
               else if (mapped === 'v') techLabel = '~';
               else if (mapped === 'g') tech = '()';
               else if (mapped === 't') { techLabel = 'T'; }
           }

           // Force harmonic notation when forcing harmonic nodes
           if (forceHarmonicNodes && harmonicFrets.has(candidate.fretIdx) && !tech) {
             tech = '<>';
           }

           colNotes.push({ stringIdx: candidate.stringIdx, fretIdx: candidate.fretIdx, tech, techLabel });
           attempts++;
        }
        if (colNotes.length > 0) phrase.push({ id: `col-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'melody', notes: colNotes.sort((a,b) => a.stringIdx - b.stringIdx), _debug: {} });
     }
     return phrase;
  };

  let ptr = 0;
  let lastPercLabel = '';
  let chordIdx = 0;
  // Debug: track injections per technique
  const percInjectionCounts = {};
  percussiveTechs.forEach(p => { percInjectionCounts[p] = 0; });

  while (ptr < length) {
      // Advance chord progression index
      if (chordTargetSets.length > 0) {
        chordIdx = Math.floor(ptr / 4) % chordTargetSets.length;
      }
      
      // 1. Insert Bass note
      if (bassNotes.length > 0 && Math.random() > 0.2) {
          const b = bassNotes[Math.floor(Math.random() * bassNotes.length)];
          columns.push({ id: `col-${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'melody', notes: [{ stringIdx: b.stringIdx, fretIdx: b.fretIdx, tech: '', techLabel: '' }]});
          ptr++;
      }

      // 2. Motif Structure: A A' B
      const phraseLen = Math.min(4, length - ptr);
      if (phraseLen <= 0) break;
      
      const chordTarget = chordTargetSets[chordIdx] || null;
      const motifA = generatePhrase(phraseLen, complexity >= 3, complexity >= 2, chordTarget);
      columns.push(...motifA);
      ptr += phraseLen;

      // 3. Percussive hit injection (Data-driven registry logic)
      //    Raised probability from 0.5 to 0.7, and guaranteed minimum insertion below
      if (percussiveTechs.length > 0 && ptr < length - 1 && Math.random() < 0.7) {
          const availablePerc = percussiveTechs.filter(p => p !== lastPercLabel);
          const percChoice = availablePerc.length > 0 ? availablePerc[Math.floor(Math.random() * availablePerc.length)] : percussiveTechs[0];
          lastPercLabel = percChoice;
          
          const techDef = TECHNIQUE_REGISTRY[percChoice];
          if (techDef) {
              const prevActive = ptr > 0 ? columns[columns.length - 1] : null;
              const prevHasStrings = prevActive && prevActive.notes && prevActive.notes.some(n => typeof n.stringIdx === 'number');
              
              if (techDef.allowedWithStrings && prevActive && prevHasStrings) {
                  // Safely overlay the percussive marker onto the previous column
                  if (!prevActive.notes.some(n => n.isPerc)) {
                      prevActive.notes.push({ isPerc: true, techLabel: techDef.label, stringIdx: 'perc' });
                      percInjectionCounts[percChoice] = (percInjectionCounts[percChoice] || 0) + 1;
                  }
              } else {
                  // Insert as a standalone percussion column
                  columns.push({ 
                    id: `col-perc-${Math.random().toString(36).slice(2)}`, 
                    type: 'melody', 
                    notes: [{ isPerc: true, techLabel: techDef.label, stringIdx: 'perc' }],
                    _debug: { technique: percChoice, reason: !techDef.allowedWithStrings ? techDef.skipReason : 'standalone' }
                  });
                  percInjectionCounts[percChoice] = (percInjectionCounts[percChoice] || 0) + 1;
                  ptr++;
              }
          }
      }

      // Repeat Motif A
      if (ptr + phraseLen <= length && Math.random() > 0.3) {
          columns.push(...motifA.map(c => ({ ...c, id: `col-repA-${Math.random().toString(36).slice(2)}` })));
          ptr += phraseLen;
      }

      // Vary Motif (A')
      if (ptr + phraseLen <= length) {
          const motifAPrime = motifA.map(col => {
              if (Math.random() < 0.3) return generatePhrase(1, false, false, chordTarget)[0];
              return { ...col, id: `col-apri-${Math.random().toString(36).slice(2)}` };
          }).filter(Boolean);
          columns.push(...motifAPrime);
          ptr += phraseLen;
      }
  }

  // ── GUARANTEED MINIMUM PERCUSSIVE INSERTION ────────────────────────────────
  // If any selected technique was never injected, force-insert it at regular intervals
  percussiveTechs.forEach(techName => {
    if ((percInjectionCounts[techName] || 0) === 0) {
      const techDef = TECHNIQUE_REGISTRY[techName];
      if (!techDef) return;
      // Insert at every 4th column position (or at least once)
      const insertPositions = columns.length >= 4
        ? [Math.floor(columns.length * 0.25), Math.floor(columns.length * 0.75)]
        : [Math.floor(columns.length / 2)];
      insertPositions.forEach(pos => {
        if (pos >= 0 && pos < columns.length) {
          const target = columns[pos];
          if (target && target.notes && !target.notes.some(n => n.isPerc)) {
            if (techDef.allowedWithStrings) {
              target.notes.push({ isPerc: true, techLabel: techDef.label, stringIdx: 'perc' });
            } else {
              // Insert standalone column after this position
              columns.splice(pos + 1, 0, {
                id: `col-forced-${techName.replace(/\s/g,'-')}-${Math.random().toString(36).slice(2)}`,
                type: 'melody',
                notes: [{ isPerc: true, techLabel: techDef.label, stringIdx: 'perc' }],
                _debug: { technique: techName, reason: 'guaranteed_minimum_insertion' }
              });
            }
          }
        }
      });
    }
  });

  // Trim to exact length
  columns = columns.slice(0, length);
  
  // Assign globally unique IDs to every column
  columns = columns.map((col, i) => ({ ...col, id: col.id && col.id.startsWith('col-') ? col.id : `col-${i}-${Math.random().toString(36).slice(2)}` }));
  
  return columns;
}

/**
 * Generate a pure percussive fill (1–2 bars of only percussion hits)
 */
export function generatePercFill(percussiveTechs = [], bars = 1) {
  if (percussiveTechs.length === 0) {
    percussiveTechs = ['Kick Drum (Wrist)', 'Snare (Thumb Slap)', 'Body Tap'];
  }
  
  const beats = bars * 8; // 16th-note resolution
  const columns = [];
  
  const patterns = {
    'Kick Drum (Wrist)': [0, 4, 8, 12, 6],
    'Snare (Thumb Slap)': [2, 6, 10, 14],
    'Body Tap': [1, 3, 5, 7, 9, 11, 13, 15],
    'String Slap': [2, 10],
    'Nail Attack': [0, 4, 8, 12],
    'Advanced Harmonics': [3, 11],
    'Artificial Harmonics': [7, 15],
    '2-Hand Tapping': [1, 5, 9, 13],
  };
  
  for (let beat = 0; beat < beats; beat++) {
    const hits = percussiveTechs.filter(tech => {
      const pat = patterns[tech] || [];
      return pat.some(p => p % beats === beat);
    });
        if (hits.length > 0) {
      const labels = hits.map(h => PERC_LABELS[h] || 'x').join('');
      columns.push({
        id: `col-percfill-${beat}-${Math.random()}`,
        type: 'melody',
        notes: [{ isPerc: true, techLabel: labels, stringIdx: 'perc' }]
      });
    } else if (beat % 4 === 0) {
      columns.push({ id: `col-spacer-${beat}-${Math.random()}`, type: 'spacer', notes: [] });
    }
  }
  
  return columns;
}
