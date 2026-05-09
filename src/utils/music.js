// Array of 12 note names starting from C
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a standard MIDI note number to its string representation (e.g., 60 -> C4)
 */
export function midiToNoteName(midiNumber) {
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = NOTE_NAMES[midiNumber % 12];
  return `${noteName}${octave}`;
}

/**
 * Provide common guitar tunings.
 * Strings are ordered from String 1 (Highest pitch) to String 6 (Lowest pitch).
 * MIDI: e4=64, B3=59, G3=55, D3=50, A2=45, E2=40
 */
export const TUNINGS = {
  Standard:         [64, 59, 55, 50, 45, 40],
  'Drop D':         [64, 59, 55, 50, 45, 38],
  'Open G':         [62, 59, 55, 50, 43, 38],
  'Open D':         [62, 57, 54, 50, 45, 38],
  'Open E':         [64, 59, 56, 52, 47, 40],
  'Open A':         [64, 61, 57, 52, 45, 40],
  DADGAD:           [62, 57, 55, 50, 45, 38],
  CGCGCE:           [64, 60, 55, 48, 43, 36],
  'Half-Step Down': [63, 58, 54, 49, 44, 39],
  'Full-Step Down': [62, 57, 53, 48, 43, 38],
  'Double Drop D':  [62, 59, 55, 50, 45, 38],
  'Open C':         [60, 57, 55, 48, 43, 36],
};

export const SCALES = {
  // Standard Western
  Major:              [0, 2, 4, 5, 7, 9, 11],
  Minor:              [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor':   [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor':    [0, 2, 3, 5, 7, 9, 11],
  'Hungarian Minor':  [0, 2, 3, 6, 7, 8, 11],
  Dorian:             [0, 2, 3, 5, 7, 9, 10],
  Phrygian:           [0, 1, 3, 5, 7, 8, 10],
  'Phrygian Dominant':[0, 1, 4, 5, 7, 8, 10],
  Lydian:             [0, 2, 4, 6, 7, 9, 11],
  Mixolydian:         [0, 2, 4, 5, 7, 9, 10],
  Aeolian:            [0, 2, 3, 5, 7, 8, 10],
  Locrian:            [0, 1, 3, 5, 6, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  Blues:              [0, 3, 5, 6, 7, 10],
  'Whole Tone':       [0, 2, 4, 6, 8, 10],
  Diminished:         [0, 2, 3, 5, 6, 8, 9, 11],
  // Indian / Raga-inspired
  'Raga Bhairav':     [0, 1, 4, 5, 7, 8, 11],
  'Raga Yaman':       [0, 2, 4, 6, 7, 9, 11],
  'Raga Bhairavi':    [0, 1, 3, 5, 7, 8, 10],
  'Raga Kafi':        [0, 2, 3, 5, 7, 9, 10],
  'Raga Bilawal':     [0, 2, 4, 5, 7, 9, 11],
  // Japanese
  'Hirajoshi':        [0, 2, 3, 7, 8],
  'In Scale':         [0, 1, 5, 7, 8],
  // Middle Eastern
  'Double Harmonic':  [0, 1, 4, 5, 7, 8, 11],
};

/**
 * Harmonic node frets where natural harmonics chime the brightest.
 * Includes the overtone label and a musical interval description.
 */
export const HARMONIC_NODES = [
  { fret: 12, label: 'P8',  desc: 'Octave',        color: '#f0a500' },
  { fret: 7,  label: 'P5',  desc: '5th (Oct+5)',   color: '#58a6ff' },
  { fret: 5,  label: 'P4',  desc: '2nd Octave',    color: '#3fb950' },
  { fret: 19, label: 'P5ʼ', desc: '3rd Oct + 5th', color: '#58a6ff' },
  { fret: 24, label: 'P8ʼ', desc: '3rd Octave',    color: '#f0a500' },
  { fret: 9,  label: 'M3',  desc: 'Maj 3rd node',  color: '#da3633' },
  { fret: 4,  label: 'M3ʼ', desc: 'Maj 3rd (alt)', color: '#da3633' },
];

/**
 * Determines if a MIDI note is within a given scale.
 */
export function isInScale(midiNumber, rootMidi = 60, scaleName = 'Major') {
  const intervals = SCALES[scaleName] || SCALES.Major;
  const normalizedMidi = midiNumber % 12;
  const normalizedRoot = rootMidi % 12;
  const noteInterval = (normalizedMidi - normalizedRoot + 12) % 12;
  return intervals.includes(noteInterval);
}

/**
 * Get the MIDI note index for a given note name.
 */
export function getRootMidiFromName(noteName) {
  const index = NOTE_NAMES.indexOf(noteName);
  return index === -1 ? 0 : index;
}

/**
 * Maps pitch events strictly to the lowest possible fret placement bounds across available strings.
 */
export function mapMidiToGuitar(midiNotes, tuningKey = 'Standard') {
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  
  return midiNotes.map(note => {
     let bestString = null;
     let bestFret = 999;
     
     tuning.forEach((openMidi, sIdx) => {
        const fret = Math.round(note.pitch) - openMidi;
        if (fret >= 0 && fret <= 24) {
           if (fret < bestFret) {
              bestFret = fret;
              bestString = sIdx;
           }
        }
     });
     
     return {
        ...note,
        stringIdx: bestString !== null ? bestString : 0,
        fretIdx: bestFret !== 999 ? bestFret : 0
     };
  });
}

/**
 * Perform a crude heuristic search scoring interval hits to guess a song's key.
 */
export function detectScaleKey(midiNotes) {
   if (!midiNotes || midiNotes.length === 0) return 'Unknown';
   
   const counts = new Array(12).fill(0);
   midiNotes.forEach(n => {
       counts[Math.round(n.pitch) % 12]++;
   });
   
   let rootIdx = 0; let maxCount = 0;
   for(let i=0; i<12; i++) {
       if (counts[i] > maxCount) { maxCount = counts[i]; rootIdx = i; }
   }
   
   const rootName = NOTE_NAMES[rootIdx];
   
   const foundIntervals = [];
   for(let i=0; i<12; i++) {
       if (counts[i] > 0) foundIntervals.push((i - rootIdx + 12) % 12);
   }
   foundIntervals.sort((a,b)=>a-b);
   
   let bestScale = 'Major';
   let bestMatches = -1;
   
   Object.keys(SCALES).forEach(scale => {
       const intervals = SCALES[scale];
       let matches = 0;
       foundIntervals.forEach(fi => {
           if (intervals.includes(fi)) matches++;
       });
       if (matches > bestMatches) {
           bestMatches = matches;
           bestScale = scale;
       }
   });
   
   return `${rootName} ${bestScale}`;
}

/**
 * Guess the likely open tuning from an array of MIDI pitches (lowest frequencies).
 */
export function guessOpenTuning(midiNotes) {
  if (!midiNotes || midiNotes.length === 0) return 'Standard';
  
  // Get the lowest-pitched notes (bottom 20%)
  const sorted = [...midiNotes].sort((a, b) => a.pitch - b.pitch);
  const lowNotes = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.2)));
  const avgLow = Math.round(lowNotes.reduce((s, n) => s + n.pitch, 0) / lowNotes.length);
  
  // Score each tuning by how well its lowest string (index 5) matches
  let bestTuning = 'Standard';
  let bestDiff = 999;
  Object.entries(TUNINGS).forEach(([name, strings]) => {
    const lowestString = strings[5]; // 6th string (lowest)
    const diff = Math.abs(lowestString - avgLow);
    if (diff < bestDiff) { bestDiff = diff; bestTuning = name; }
  });
  
  return bestTuning;
}

/**
 * Detect chord progression from MIDI column data.
 * Returns array of chord names detected at roughly 1-bar intervals.
 */
export function detectChordProgressions(columns) {
  if (!columns || columns.length === 0) return [];
  const chunkSize = Math.max(4, Math.floor(columns.length / 8));
  const chords = [];
  
  for (let i = 0; i < columns.length; i += chunkSize) {
    const chunk = columns.slice(i, i + chunkSize);
    const pitchClasses = new Set();
    chunk.forEach(col => {
      col.notes?.forEach(n => {
        if (!n.isPerc && typeof n.fretIdx === 'number') {
          pitchClasses.add(n.fretIdx % 12);
        }
      });
    });
    
    if (pitchClasses.size >= 2) {
      const notes = [...pitchClasses];
      const rootIdx = notes[0];
      const rootName = NOTE_NAMES[rootIdx % 12];
      const interval = (notes[1] - notes[0] + 12) % 12;
      let quality = 'maj';
      if (interval === 3) quality = 'm';
      else if (interval === 4) quality = 'maj';
      else if (interval === 7) quality = '5';
      chords.push(`${rootName}${quality}`);
    } else {
      chords.push('—');
    }
  }
  return chords;
}

// ─── Scale detection from Editor columns ────────────────────────────────────
/**
 * Analyse editor columns to determine the most likely scale being used.
 * Returns { rootName, scaleName, confidence, pitchClasses } or null if not enough data.
 * Needs at least 3 distinct pitch classes to make a reasonable guess.
 */
export function detectScaleFromColumns(columns, tuningKey = 'Standard') {
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];

  // Collect all pitch classes from melodic notes
  const pcCounts = new Array(12).fill(0);
  let totalNotes = 0;

  columns.forEach(col => {
    if (!col.notes) return;
    col.notes.forEach(n => {
      if (n.isPerc || typeof n.fretIdx !== 'number' || typeof n.stringIdx !== 'number') return;
      const midi = (tuning[n.stringIdx] || 0) + n.fretIdx;
      pcCounts[midi % 12]++;
      totalNotes++;
    });
  });

  const distinctPCs = pcCounts.filter(c => c > 0).length;
  if (totalNotes < 3 || distinctPCs < 3) return null;

  // Try every root x scale combination and score by weighted match
  let bestRoot = 0, bestScale = 'Major', bestScore = -1;

  for (let root = 0; root < 12; root++) {
    Object.entries(SCALES).forEach(([name, intervals]) => {
      let score = 0;
      let penalty = 0;
      for (let pc = 0; pc < 12; pc++) {
        const interval = (pc - root + 12) % 12;
        const inScale = intervals.includes(interval);
        if (inScale) {
          score += pcCounts[pc] * 2; // Notes that ARE in scale boost score
        } else {
          penalty += pcCounts[pc]; // Notes NOT in scale penalise
        }
      }
      const finalScore = score - penalty * 1.5;
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestRoot = root;
        bestScale = name;
      }
    });
  }

  const confidence = Math.min(100, Math.round((bestScore / (totalNotes * 2)) * 100));

  return {
    rootName: NOTE_NAMES[bestRoot],
    scaleName: bestScale,
    confidence: Math.max(0, confidence),
    pitchClasses: pcCounts,
  };
}

// ─── Get chords that fit a scale ────────────────────────────────────────────
/**
 * Given a rootName + scaleName, returns an array of chord objects
 * { name, type, romanNumeral, notes: [{s, f}] } that are diatonic to the scale.
 */
export function getChordsInScale(rootName, scaleName, tuningKey = 'Standard') {
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  if (rootIdx === -1) return [];
  const intervals = SCALES[scaleName] || SCALES.Major;

  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const results = [];

  intervals.forEach((interval, degree) => {
    const chordRoot = (rootIdx + interval) % 12;
    const chordRootName = NOTE_NAMES[chordRoot];

    // Build triad: root, third, fifth from scale degrees
    const thirdInterval = intervals[(degree + 2) % intervals.length];
    const fifthInterval = intervals[(degree + 4) % intervals.length];

    const third = ((rootIdx + thirdInterval) - chordRoot + 12) % 12;
    const fifth = ((rootIdx + fifthInterval) - chordRoot + 12) % 12;

    let quality = '';
    let qualityLabel = 'maj';
    if (third === 3 && fifth === 7) { quality = 'm'; qualityLabel = 'min'; }
    else if (third === 3 && fifth === 6) { quality = 'dim'; qualityLabel = 'dim'; }
    else if (third === 4 && fifth === 8) { quality = 'aug'; qualityLabel = 'aug'; }
    else if (third === 4 && fifth === 7) { quality = ''; qualityLabel = 'maj'; }
    else { quality = ''; qualityLabel = 'maj'; }

    const roman = romanNumerals[degree] || `${degree + 1}`;
    const displayRoman = qualityLabel === 'min' || qualityLabel === 'dim'
      ? roman.toLowerCase() : roman;

    // Build a simple open-position voicing on guitar
    const chordNotes = [];
    const targetMidis = [chordRoot, (chordRoot + third) % 12, (chordRoot + fifth) % 12];

    tuning.forEach((openMidi, sIdx) => {
      for (let fret = 0; fret <= 5; fret++) {
        const midi = openMidi + fret;
        if (targetMidis.includes(midi % 12)) {
          chordNotes.push({ s: sIdx, f: fret });
          break;
        }
      }
    });

    results.push({
      name: `${chordRootName}${quality}`,
      type: qualityLabel,
      romanNumeral: displayRoman + (quality === 'dim' ? '°' : ''),
      notes: chordNotes,
      degree: degree + 1,
    });
  });

  return results;
}

// ─── Suggest next notes based on recent context ─────────────────────────────
/**
 * Given recent MIDI pitch classes and current scale, suggest 3-5 fitting
 * next notes prioritising stepwise motion, chord tones, and melodic tendency.
 */
export function suggestNextNotes(recentMidis, rootName, scaleName) {
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  if (rootIdx === -1 || recentMidis.length === 0) return [];

  const intervals = SCALES[scaleName] || SCALES.Major;
  const scaleNotes = intervals.map(i => (rootIdx + i) % 12);
  const last = recentMidis[recentMidis.length - 1] % 12;

  // Score each scale note by proximity + music-theory weighting
  const scored = scaleNotes.map(pc => {
    const dist = Math.min(Math.abs(pc - last), 12 - Math.abs(pc - last));
    // Stepwise is best (dist 1-2), then thirds (3-4), root resolution bonus
    let score = 10 - dist * 2;
    if (pc === rootIdx) score += 3; // Tonic resolution
    if (intervals.indexOf((pc - rootIdx + 12) % 12) === 4) score += 2; // Fifth
    if (intervals.indexOf((pc - rootIdx + 12) % 12) === 2) score += 1; // Third
    // Penalise repeating the same note
    if (pc === last) score -= 5;
    return { pc, note: NOTE_NAMES[pc], score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}
