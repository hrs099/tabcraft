import { SCALES, TUNINGS, NOTE_NAMES, getRootMidiFromName } from './music';

/**
 * Percussion label codes for the dedicated Perc row
 */
const PERC_LABELS = {
  'Kick Drum (Wrist)': 'K',
  'Snare (Thumb Slap)': 'S',
  'String Slap': 'X',
  'Body Tap': 'T',
  'Nail Attack': 'N',
};

export function generateSolo(params) {
  const { 
    scaleName = 'Major', 
    rootName = 'C', 
    mood = 'Calm', 
    complexity = 1, 
    percussiveTechs = [],
    tuningKey = 'Standard'
  } = params;

  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  const rootMidiOffset = getRootMidiFromName(rootName);
  const intervals = SCALES[scaleName] || SCALES.Major;
  
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

  const bassNotes = playableNotes.filter(n => n.stringIdx >= 3 && (n.noteInterval === 0 || n.noteInterval === 7));
  const melodyNotes = playableNotes.filter(n => n.stringIdx <= 2);

  const length = Math.floor(Math.random() * (32 - 16 + 1)) + 16;
  let columns = [];
  
  // Techniques Pool based on Mood
  const techniquesPool = [];
  if (mood === 'Calm') techniquesPool.push('s', 'harm'); 
  else if (mood === 'Aggressive') techniquesPool.push('h', 'p', 'b'); 
  else if (mood === 'Emotional') techniquesPool.push('v', 'p', 's'); 
  else if (mood === 'Playful') techniquesPool.push('g', 't', 'h'); 
  else techniquesPool.push('h', 's');

  // Generate a melodic phrase of N columns, optionally with chords & articulations
  const generatePhrase = (len, allowChords, allowTech) => {
     let phrase = [];
     let baseFret = null;
     for(let i=0; i<len; i++) {
        let colNotes = [];
        let numNotes = allowChords ? (Math.random() > 0.5 ? Math.min(complexity, 4) : 1) : 1;
        let attempts = 0;
        
        while(colNotes.length < numNotes && attempts < 30) {
           const candidate = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
           if (colNotes.some(n => n.stringIdx === candidate.stringIdx)) { attempts++; continue; }
           
           if (baseFret === null && candidate.fretIdx !== 0) baseFret = candidate.fretIdx;
           if (baseFret !== null && candidate.fretIdx !== 0 && Math.abs(candidate.fretIdx - baseFret) > 4) {
               attempts++; continue;
           }

           let tech = ''; let techLabel = '';
           if (allowTech && candidate.fretIdx !== 0 && Math.random() < 0.3 && techniquesPool.length > 0) {
               let mapped = techniquesPool[Math.floor(Math.random() * techniquesPool.length)];
               if (mapped === 'harm') {
                   if ([5, 7, 12].includes(candidate.fretIdx)) tech = '< >';
               } else if (mapped === 'b') techLabel = 'b';
               else if (['h', 'p', 's'].includes(mapped)) techLabel = mapped;
               else if (mapped === 'v') techLabel = '~';
               else if (mapped === 'g') tech = '( )';
               else if (mapped === 't') { techLabel = 'Tap'; }
           }

           colNotes.push({ stringIdx: candidate.stringIdx, fretIdx: candidate.fretIdx, tech, techLabel });
           attempts++;
        }
        if (colNotes.length > 0) phrase.push({ id: Date.now() + Math.random(), type: 'melody', notes: colNotes.sort((a,b) => a.stringIdx - b.stringIdx) });
     }
     return phrase;
  };

  let ptr = 0;
  let lastPercLabel = '';

  while (ptr < length) {
      // 1. Insert Bass note
      if (bassNotes.length > 0 && Math.random() > 0.2) {
          const b = bassNotes[Math.floor(Math.random() * bassNotes.length)];
          columns.push({ id: Date.now() + Math.random(), type: 'melody', notes: [{ stringIdx: b.stringIdx, fretIdx: b.fretIdx, tech: '', techLabel: '' }]});
          ptr++;
      }

      // 2. Motif Structure: A A' B
      const phraseLen = Math.min(4, length - ptr);
      if (phraseLen <= 0) break;
      
      const motifA = generatePhrase(phraseLen, complexity >= 3, complexity >= 2);
      columns.push(...motifA);
      ptr += phraseLen;

      // 3. Percussive hit — placed into its own perc layer
      if (percussiveTechs.length > 0 && ptr < length - 1 && Math.random() < 0.5) {
          const availablePerc = percussiveTechs.filter(p => p !== lastPercLabel);
          const percChoice = availablePerc.length > 0 ? availablePerc[Math.floor(Math.random() * availablePerc.length)] : percussiveTechs[0];
          lastPercLabel = percChoice;
          const label = PERC_LABELS[percChoice] || 'x';
          columns.push({ 
            id: Date.now() + Math.random(), 
            type: 'melody', 
            notes: [{ isPerc: true, techLabel: label, stringIdx: 'perc' }]
          });
          ptr++;
      }

      // Repeat Motif A
      if (ptr + phraseLen <= length && Math.random() > 0.3) {
          columns.push(...motifA);
          ptr += phraseLen;
      }

      // Vary Motif (A')
      if (ptr + phraseLen <= length) {
          const motifAPrime = motifA.map(col => {
              if (Math.random() < 0.3) return generatePhrase(1, false, false)[0];
              return col;
          }).filter(Boolean);
          columns.push(...motifAPrime);
          ptr += phraseLen;
      }
  }

  // Trim to exact length
  columns = columns.slice(0, length);
  
  // Assign unique IDs to every column
  columns = columns.map((col, i) => ({ ...col, id: col.id || Date.now() + i }));
  
  return columns;
}
