import * as Tone from 'tone';
import { TUNINGS } from './music';

let synth = null;
let percSynth = null;
let transportPart = null;
let clickLoop = null;

export async function initAudio() {
  await Tone.start();
  if (!synth) {
    // PolySynth wrapping Synth for reliable polyphonic playback
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 1.2 },
    }).toDestination();
    synth.volume.value = -8;
  }
  
  if (!percSynth) {
    percSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
    }).toDestination();
    percSynth.volume.value = -10;
  }
}

/**
 * Play a single MIDI note immediately (used when clicking frets)
 */
export function playNote(midiNote) {
  if (synth) {
     const freq = Tone.Frequency(midiNote, 'midi').toFrequency();
     synth.triggerAttackRelease(freq, '8n');
  }
}

/**
 * Play back an entire tab sequence through Tone.Transport
 */
export function playTab(columns, bpm, metronomeOn, tuningKey = 'Standard', onColumnChange, onStop) {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (transportPart) { transportPart.dispose(); transportPart = null; }
  if (clickLoop) { clickLoop.dispose(); clickLoop = null; }

  Tone.Transport.bpm.value = bpm;
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  
  const events = [];
  let timePos = 0;
  
  columns.forEach((col, colIdx) => {
    if (col.type === 'label' || col.type === 'repeat_start' || col.type === 'repeat_end') return;
    
    const hasNotes = col.notes && col.notes.some(n => !n.isPerc && n.stringIdx !== 'perc' && typeof n.fretIdx === 'number');
    const hasPerc = col.notes && col.notes.some(n => n.isPerc || n.stringIdx === 'perc');

    if (hasNotes || hasPerc) {
      const frequencies = [];
      if (hasNotes) {
        col.notes.forEach(n => {
          if (!n.isPerc && n.stringIdx !== 'perc' && typeof n.fretIdx === 'number' && tuning[n.stringIdx] !== undefined) {
            frequencies.push(Tone.Frequency(tuning[n.stringIdx] + n.fretIdx, 'midi').toFrequency());
          }
        });
      }
      events.push({ time: `0:0:${timePos}`, notes: frequencies, percussion: hasPerc, colIdx });
    }
    timePos++;
  });

  transportPart = new Tone.Part((time, value) => {
      if (value.notes && value.notes.length > 0) {
          synth.triggerAttackRelease(value.notes, '8n', time);
      }
      if (value.percussion) {
          percSynth.triggerAttackRelease('16n', time);
      }
      // Notify UI of the current column for highlighting
      if (onColumnChange) {
          Tone.Draw.schedule(() => onColumnChange(value.colIdx), time);
      }
  }, events).start(0);

  if (metronomeOn) {
     const metroSynth = new Tone.MembraneSynth({ volume: -14 }).toDestination();
     clickLoop = new Tone.Loop(time => {
         metroSynth.triggerAttackRelease('C1', '8n', time);
     }, '4n').start(0);
  }

  const totalQuarterNotes = timePos / 4;
  const durationSeconds = (totalQuarterNotes * 60) / bpm;
  
  Tone.Transport.start();
  
  Tone.Transport.scheduleOnce(() => {
      stopTab();
      if (onColumnChange) onColumnChange(null);
      if (onStop) onStop();
  }, `+${durationSeconds + 0.5}`);
}

export function stopTab() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
}
