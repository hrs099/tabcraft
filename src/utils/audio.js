/**
 * audio.js — Client-side Audio Utilities (Trimmed)
 *
 * All heavy DSP (DFT, HPSS, HPS, onset detection) has been removed.
 * The browser is no longer responsible for any audio analysis.
 * All transcription is handled by the Python backend via /api/transcribe.
 *
 * This module retains:
 *   - detectOpenTuning()  — lightweight tuning guess from pre-computed MIDI data
 *   - analyzeGroove()     — lightweight groove analysis from pre-computed onset times
 *   - Two stub exports that throw fatal errors to prevent accidental local-path regressions
 */

import { TUNINGS } from './music';

// ── detectOpenTuning ──────────────────────────────────────────────────────────
/**
 * Lightweight heuristic: given an array of {midi, freq} objects (already
 * computed by the backend), guess the likely open tuning by scoring each
 * preset against the detected low-register fundamentals.
 *
 * This runs in the browser on pre-computed data — it does NOT process audio.
 *
 * @param {Array<{midi: number, freq: number}>} fundamentals
 * @returns {string} Tuning name from TUNINGS map, e.g. 'Standard'
 */
export function detectOpenTuning(fundamentals) {
  if (!fundamentals || fundamentals.length === 0) return 'Standard';

  // Consider only low-register fundamentals (below MIDI 55 = G3)
  const lowF = fundamentals.filter(f => f.midi < 55);
  if (lowF.length === 0) return 'Standard';

  const midiCounts = {};
  lowF.forEach(f => {
    midiCounts[f.midi] = (midiCounts[f.midi] || 0) + 1;
  });

  // Take the 6 most common low-register MIDI pitches
  const sortedMidis = Object.entries(midiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([midi]) => parseInt(midi, 10))
    .sort((a, b) => a - b);

  let bestName = 'Standard';
  let bestScore = -1;

  Object.entries(TUNINGS).forEach(([name, strings]) => {
    // Compare against the 3 lowest strings (indices 3, 4, 5 in high→low order)
    const lowStrings = strings.slice(3).sort((a, b) => a - b);
    let score = 0;
    lowStrings.forEach(s => {
      sortedMidis.forEach(m => {
        if (Math.abs(s - m) <= 1) score++;
      });
    });
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  });

  return bestName;
}

// ── analyzeGroove ─────────────────────────────────────────────────────────────
/**
 * Characterise rhythmic feel from an array of onset time objects.
 * Operates on pre-computed onset data — does NOT process raw audio.
 *
 * @param {Array<{time: number}>} onsets
 * @returns {{ type: string, swingRatio: number }}
 */
export function analyzeGroove(onsets) {
  if (!onsets || onsets.length < 4) {
    return { type: 'Straight', swingRatio: 1.0 };
  }

  const iois = [];
  for (let i = 1; i < onsets.length; i++) {
    const ioi = onsets[i].time - onsets[i - 1].time;
    if (ioi > 0.05 && ioi < 2.0) iois.push(ioi);
  }

  if (iois.length === 0) return { type: 'Straight', swingRatio: 1.0 };

  const avg = iois.reduce((s, v) => s + v, 0) / iois.length;
  const variance = iois.reduce((s, v) => s + Math.abs(v - avg), 0) / iois.length / avg;

  const evenIOIs = iois.filter((_, i) => i % 2 === 0);
  const oddIOIs = iois.filter((_, i) => i % 2 !== 0);
  const evenAvg = evenIOIs.length > 0 ? evenIOIs.reduce((s, v) => s + v, 0) / evenIOIs.length : avg;
  const oddAvg = oddIOIs.length > 0 ? oddIOIs.reduce((s, v) => s + v, 0) / oddIOIs.length : avg;
  const swingRatio = oddAvg > 0 ? Math.round((evenAvg / oddAvg) * 100) / 100 : 1.0;

  let type = 'Straight (Tight Grid)';
  if (swingRatio > 1.45) type = 'Heavy Swing';
  else if (swingRatio > 1.15) type = 'Swung (Triplet Feel)';
  else if (variance > 0.25) type = 'Rubato / Free Timing';
  else if (variance > 0.12) type = 'Syncopated';
  else if (variance > 0.05) type = 'Slightly Swung';

  return { type, swingRatio };
}

// ── Fatal stubs — prevent accidental local-path regressions ──────────────────
/**
 * @deprecated All audio transcription is handled by the Python backend.
 * Upload the raw audio file to /api/transcribe instead.
 */
export async function transcribeAudioPitches(_audioBuffer, _onProgress) {
  throw new Error(
    '[Astra FATAL] transcribeAudioPitches() called in browser. ' +
    'Audio transcription must be routed through the /api/transcribe FastAPI backend.'
  );
}

/**
 * @deprecated Percussive transient detection is handled by the Python HPSS pipeline.
 */
export async function detectPercussionSpikes(_audioBuffer) {
  throw new Error(
    '[Astra FATAL] detectPercussionSpikes() called in browser. ' +
    'Rely on backend HPSS transient analysis via /api/transcribe.'
  );
}
