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
 */
export const TUNINGS = {
  Standard: [64, 59, 55, 50, 45, 40],
  'Drop D': [64, 59, 55, 50, 45, 38],
  'Open G': [62, 59, 55, 50, 43, 38],
  'Open D': [62, 57, 54, 50, 45, 38],
  DADGAD: [62, 57, 55, 50, 45, 38]
};

export const SCALES = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10]
};

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
