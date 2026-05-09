import * as Tone from 'tone';
import { TUNINGS } from './music';

// ── Real acoustic guitar sample URLs (nbrosowsky/tonejs-instruments) ────
// Using jsDelivr CDN for reliable, fast delivery of real guitar recordings.
// Every note from E2–E5 is covered by a real plucked-string sample.
const SAMPLE_BASE_URL =
  'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/guitar-acoustic/';

// Map enough chromatic reference points so Tone.Sampler fills in the gaps
// with minimal pitch-shifting (max ±1 semitone).  's' = sharp.
const GUITAR_SAMPLES = {
  'E2':  'E2.mp3',
  'F2':  'F2.mp3',
  'F#2': 'Fs2.mp3',
  'G2':  'G2.mp3',
  'G#2': 'Gs2.mp3',
  'A2':  'A2.mp3',
  'A#2': 'As2.mp3',
  'B2':  'B2.mp3',
  'C3':  'C3.mp3',
  'C#3': 'Cs3.mp3',
  'D3':  'D3.mp3',
  'D#3': 'Ds3.mp3',
  'E3':  'E3.mp3',
  'F3':  'F3.mp3',
  'F#3': 'Fs3.mp3',
  'G3':  'G3.mp3',
  'G#3': 'Gs3.mp3',
  'A3':  'A3.mp3',
  'A#3': 'As3.mp3',
  'B3':  'B3.mp3',
  'C4':  'C4.mp3',
  'C#4': 'Cs4.mp3',
  'D4':  'D4.mp3',
  'D#4': 'Ds4.mp3',
  'E4':  'E4.mp3',
  'F4':  'F4.mp3',
  'F#4': 'Fs4.mp3',
  'G4':  'G4.mp3',
  'G#4': 'Gs4.mp3',
  'A4':  'A4.mp3',
  'A#4': 'As4.mp3',
  'B4':  'B4.mp3',
  'C5':  'C5.mp3',
  'C#5': 'Cs5.mp3',
  'D5':  'D5.mp3',
};

// ── Persistent audio nodes ──────────────────────────────────────────────
let sampler = null;       // Real guitar sampler
let kickSynth = null;
let snareSynth = null;
let slapSynth = null;
let snareFilter = null;
let slapFilter = null;
let reverb = null;
let limiter = null;
let bassEQ = null;        // Low-shelf boost for bass presence
let metroSynth = null;
let samplerReady = false;

// ── Per-session nodes ───────────────────────────────────────────────────
let transportPart = null;
let clickLoop = null;

/**
 * Initialize the audio engine. Must be called on a user gesture.
 * Returns a Promise that resolves when all samples are loaded.
 */
export async function initAudio() {
  await Tone.start();

  // ── Master chain: Bass EQ → Reverb → Limiter → Destination ──
  if (!limiter) {
    limiter = new Tone.Limiter(-1).toDestination();

    // Compressor eliminates bass cracking by taming transient spikes
    const compressor = new Tone.Compressor({
      threshold: -18,
      ratio: 4,
      attack: 0.003,
      release: 0.15,
      knee: 6,
    }).connect(limiter);

    reverb = new Tone.Reverb({ decay: 1.6, wet: 0.12 }).connect(compressor);
    await reverb.ready;

    // 3-band EQ: heavy bass boost so low strings punch through
    bassEQ = new Tone.EQ3({
      low: 10,       // +10 dB below 300 Hz  → full, loud bass
      mid: 2,        // slight mid presence
      high: -1,      // tame harsh attack
      lowFrequency: 300,
      highFrequency: 2500,
    }).connect(reverb);
  }

  // ── Real acoustic guitar sampler ──────────────────────────────────────
  if (!sampler) {
    samplerReady = false;
    sampler = new Tone.Sampler({
      urls: GUITAR_SAMPLES,
      baseUrl: SAMPLE_BASE_URL,
      release: 1.5,          // natural ring-out after note release
      onload: () => {
        samplerReady = true;
        console.log('[TabCraft] 🎸 Acoustic guitar samples loaded');
      },
      onerror: (err) => {
        console.error('[TabCraft] Sample load error:', err);
      },
    }).connect(bassEQ);
    sampler.volume.value = 8;   // Professional studio level (Loud & Clear)
  }

  // ── Percussion (these are body-hits, not strings — synth is correct) ──
  if (!kickSynth) {
    kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.06,
      octaves: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
    }).connect(reverb);
    kickSynth.volume.value = 2;   // punchy & loud
  }

  if (!snareSynth) {
    snareFilter = new Tone.Filter(1800, 'highpass').connect(reverb);
    snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 },
    }).connect(snareFilter);
    snareSynth.volume.value = -2;
  }

  if (!slapSynth) {
    slapFilter = new Tone.Filter(3500, 'highpass').connect(reverb);
    slapSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 },
    }).connect(slapFilter);
    slapSynth.volume.value = -4;
  }

  if (!metroSynth) {
    metroSynth = new Tone.MembraneSynth({
      volume: -18,
      pitchDecay: 0.01,
      octaves: 1,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
    }).toDestination();
  }

  // Wait for all samples to finish loading
  await Tone.loaded();
  samplerReady = true;
}

/**
 * Convert MIDI note number → scientific note name that Tone.Sampler expects.
 */
function midiToNoteName(midi) {
  return Tone.Frequency(midi, 'midi').toNote();   // e.g. 40 → "E2"
}

/**
 * Play a single MIDI note (e.g. fretboard click preview).
 */
export function playNote(midiNote) {
  if (!sampler || !samplerReady) return;
  const note = midiToNoteName(midiNote);
  sampler.triggerAttackRelease(note, 1.2);
}

/**
 * How long (in seconds) one column lasts at a given BPM.
 * Each column = one 16th note.
 */
function colDurationSec(bpm) {
  return 60 / bpm / 4;
}

/**
 * Play back an entire tab sequence.
 */
export function playTab(
  columns, bpm, metronomeOn, tuningKey = 'Standard',
  onColumnChange, onStop, startAtColumn = 0, loop = false
) {
  stopTab();

  if (!sampler || !samplerReady) {
    console.warn('[TabCraft] Samples not loaded yet — try again in a moment.');
    return;
  }

  Tone.Transport.bpm.value = bpm;
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];

  const colSec = colDurationSec(bpm);
  // Notes ring for 3× column spacing so they overlap naturally
  const noteDur = Math.max(0.4, colSec * 3);

  const events = [];
  const playableColumns = columns.filter(col => col.type !== 'label' && col.type !== 'barline' && !(col.type === 'spacer' && (!col.notes || col.notes.length === 0)));
  const startOffset = Math.max(0, Math.min(startAtColumn, playableColumns.length - 1));

  playableColumns.forEach((col, colIdx) => {
    if (colIdx < startOffset) return;

    const notes = [];
    const percs = [];

    if (col.notes) {
      col.notes.forEach(n => {
        if (
          !n.isPerc &&
          n.stringIdx !== 'perc' &&
          typeof n.fretIdx === 'number' &&
          tuning[n.stringIdx] !== undefined
        ) {
          const midi = tuning[n.stringIdx] + n.fretIdx;
          notes.push(midiToNoteName(midi));
        } else if (n.isPerc || n.stringIdx === 'perc') {
          if (n.techLabel === 'K' || n.tech === 'kick') percs.push('kick');
          else if (n.techLabel === 'S' || n.tech === 'snare') percs.push('snare');
          else percs.push('slap');
        }
      });
    }

    if (notes.length > 0 || percs.length > 0) {
      events.push({
        time: `0:0:${colIdx - startOffset}`,
        notes,
        percs,
        colIdx,
      });
    }
  });

  const durationTicks = playableColumns.length - startOffset;
  const durationTime = `0:0:${durationTicks}`;

  transportPart = new Tone.Part((time, value) => {
    // ── Melodic: trigger real guitar samples ──
    if (value.notes.length > 0) {
      value.notes.forEach(note => {
        sampler.triggerAttackRelease(note, noteDur, time);
      });
    }

    // ── Percussion ──
    if (value.percs.length > 0) {
      value.percs.forEach(p => {
        if (p === 'kick')       kickSynth.triggerAttackRelease('C1', 0.3, time);
        else if (p === 'snare') snareSynth.triggerAttackRelease(0.15, time);
        else                    slapSynth.triggerAttackRelease(0.08, time);
      });
    }

    // ── Visual cursor sync ──
    if (onColumnChange) {
      Tone.Draw.schedule(() => onColumnChange(value.colIdx), time);
    }
  }, events).start(0);

  // ── Metronome (Intelligent / Follow Music) ──
  if (metronomeOn && metroSynth) {
    // Check if columns contain beat markers from transcription
    const beatEvents = events.filter(ev => {
      const col = columns[ev.colIdx];
      return col.isBeat;
    });

    if (beatEvents.length > 0) {
      // Professional "Follow Music" Metronome: Clicks exactly on detected beats
      beatEvents.forEach(bev => {
        Tone.Transport.schedule(time => {
          metroSynth.triggerAttackRelease('C3', 0.05, time);
        }, bev.time);
      });
    } else {
      // Fallback: Grid-based Metronome
      clickLoop = new Tone.Loop(time => {
        metroSynth.triggerAttackRelease('C3', 0.05, time);
      }, '4n').start(0);
    }
  }

  // ── Loop / one-shot ──
  if (loop) {
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = durationTime;
  } else {
    Tone.Transport.loop = false;
    Tone.Transport.scheduleOnce(() => {
      // Let the last note ring out before cleanup
      setTimeout(() => {
        stopTab();
        if (onColumnChange) onColumnChange(null);
        if (onStop) onStop();
      }, 1000);
    }, durationTime);
  }

  Tone.Transport.start('+0.05');
}

export function stopTab() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (transportPart) { transportPart.dispose(); transportPart = null; }
  if (clickLoop) { clickLoop.dispose(); clickLoop = null; }
  // Gracefully release ringing notes instead of hard-cutting
  if (sampler) sampler.releaseAll();
}
