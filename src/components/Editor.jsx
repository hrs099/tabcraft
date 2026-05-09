import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fretboard from './Fretboard';
import TabViewer, { exportAsPdf } from './TabViewer';
import { TUNINGS, SCALES, NOTE_NAMES, detectScaleFromColumns, getChordsInScale, suggestNextNotes } from '../utils/music';
import { generateSolo } from '../utils/generator';
import { initAudio, playTab, stopTab, playNote } from '../utils/playback';
import { useKeyboardEditorShortcuts } from '../hooks/useKeyboardEditorShortcuts';
import NoteInspector from './editor/NoteInspector';

// Valid harmonic frets where natural harmonics actually sound
const VALID_HARMONIC_FRETS = new Set([3, 4, 5, 7, 9, 12, 16, 19, 24]);

// ─── Chord Dictionary ──────────────────────────────────────────────────────
// {name, notes: [{stringIdx, fretIdx}]}
const CHORD_DICT = [
  { name: 'C',     notes: [{ s: 1, f: 1 }, { s: 2, f: 0 }, { s: 3, f: 2 }, { s: 4, f: 3 }, { s: 5, f: 3 }] },
  { name: 'Cadd9', notes: [{ s: 0, f: 3 }, { s: 1, f: 3 }, { s: 2, f: 0 }, { s: 3, f: 2 }, { s: 4, f: 3 }] },
  { name: 'G',     notes: [{ s: 0, f: 3 }, { s: 1, f: 3 }, { s: 2, f: 0 }, { s: 3, f: 0 }, { s: 4, f: 2 }, { s: 5, f: 3 }] },
  { name: 'D',     notes: [{ s: 0, f: 2 }, { s: 1, f: 3 }, { s: 2, f: 2 }, { s: 3, f: 0 }] },
  { name: 'Am',    notes: [{ s: 0, f: 0 }, { s: 1, f: 1 }, { s: 2, f: 2 }, { s: 3, f: 2 }, { s: 4, f: 0 }] },
  { name: 'Em',    notes: [{ s: 0, f: 0 }, { s: 1, f: 0 }, { s: 2, f: 0 }, { s: 3, f: 2 }, { s: 4, f: 2 }, { s: 5, f: 0 }] },
  { name: 'Dm',    notes: [{ s: 0, f: 1 }, { s: 1, f: 3 }, { s: 2, f: 2 }, { s: 3, f: 0 }] },
  { name: 'E',     notes: [{ s: 0, f: 0 }, { s: 1, f: 0 }, { s: 2, f: 1 }, { s: 3, f: 2 }, { s: 4, f: 2 }, { s: 5, f: 0 }] },
  { name: 'A',     notes: [{ s: 0, f: 0 }, { s: 1, f: 2 }, { s: 2, f: 2 }, { s: 3, f: 2 }, { s: 4, f: 0 }] },
  { name: 'F',     notes: [{ s: 0, f: 1 }, { s: 1, f: 1 }, { s: 2, f: 2 }, { s: 3, f: 3 }, { s: 4, f: 3 }, { s: 5, f: 1 }] },
  { name: 'Fmaj7', notes: [{ s: 0, f: 0 }, { s: 1, f: 1 }, { s: 2, f: 2 }, { s: 3, f: 3 }] },
  { name: 'G7',    notes: [{ s: 0, f: 1 }, { s: 1, f: 0 }, { s: 2, f: 0 }, { s: 3, f: 0 }, { s: 4, f: 2 }, { s: 5, f: 3 }] },
  { name: 'Dsus2', notes: [{ s: 0, f: 0 }, { s: 1, f: 3 }, { s: 2, f: 2 }, { s: 3, f: 0 }] },
  { name: 'Asus4', notes: [{ s: 0, f: 0 }, { s: 1, f: 3 }, { s: 2, f: 2 }, { s: 3, f: 2 }, { s: 4, f: 0 }] },
  { name: 'Bm',    notes: [{ s: 0, f: 2 }, { s: 1, f: 3 }, { s: 2, f: 4 }, { s: 3, f: 4 }, { s: 4, f: 2 }] },
];

// Articulation options
const ARTICULATIONS = [
  { label: 'h',   tech: '',    techLabel: 'h',  title: 'Hammer-on',          color: '#58a6ff' },
  { label: 'p',   tech: '',    techLabel: 'p',  title: 'Pull-off',           color: '#58a6ff' },
  { label: 's',   tech: '',    techLabel: 's',  title: 'Slide',              color: '#58a6ff' },
  { label: 'b',   tech: '',    techLabel: 'b',  title: 'Bend',               color: '#f0a500' },
  { label: '~',   tech: '',    techLabel: '~',  title: 'Vibrato',            color: '#f0a500' },
  { label: '<>',  tech: '<>',  techLabel: '',   title: 'Natural Harmonic',   color: '#3fb950' },
  { label: '()',  tech: '()',  techLabel: '',   title: 'Ghost / Muted',      color: '#8b949e' },
  { label: '<AH>',tech: '<>',  techLabel: 'AH', title: 'Adv. Harmonics',    color: '#da3633' },
  { label: '<ArH>',tech:'<>',  techLabel: 'ArH',title: 'Artif. Harmonics',  color: '#bc8cff' },
  { label: '2T',  tech: '',    techLabel: '2T', title: '2-Hand Tapping',     color: '#ff7b72' },
];

function CustomTuningDialog({ onSave, onClose }) {
  const defaults = [64, 59, 55, 50, 45, 40];
  const labels = ['e (1)', 'B (2)', 'G (3)', 'D (4)', 'A (5)', 'E (6)'];
  const [values, setValues] = useState([...defaults]);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#58a6ff]/40 rounded-2xl p-6 w-96 shadow-2xl">
        <h3 className="text-lg font-bold text-[#58a6ff] mb-4">Custom Tuning</h3>
        <p className="text-xs text-gray-400 mb-4">Enter MIDI values for each string (e4=64, B3=59, G3=55, D3=50, A2=45, E2=40)</p>
        <div className="space-y-2">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 font-mono">{label}</span>
              <input
                type="number" min="28" max="88"
                value={values[i]}
                onChange={e => { const v = [...values]; v[i] = Number(e.target.value); setValues(v); }}
                className="flex-1 bg-[#0d1117] border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-[#58a6ff]"
              />
              <span className="text-xs text-gray-500 w-12">
                {NOTE_NAMES[values[i] % 12]}{Math.floor(values[i] / 12) - 1}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(values)} className="flex-1 py-2 bg-[#58a6ff] text-[#0d1117] font-bold rounded-lg text-sm">Apply</button>
          <button onClick={onClose} className="flex-1 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:text-white border border-gray-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Editor({ initialColumns }) {
  const [tuningKey, setTuningKey] = useState('Standard');
  const [customTuning, setCustomTuning] = useState(null);
  const [showCustomTuningDialog, setShowCustomTuningDialog] = useState(false);
  const [capo, setCapo] = useState(0);
  const [columns, setColumns] = useState([]);
  
  const [scaleName, setScaleName] = useState('Major');
  const [rootName, setRootName] = useState('C');
  const [bpm, setBpm] = useState(100);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  
  const [activeCol, setActiveCol] = useState(null);
  const [playingCol, setPlayingCol] = useState(null);
  
  // Active articulation to apply to newly placed notes
  const [activeArticulation, setActiveArticulation] = useState(null);
  
  // Harmonics view
  const [harmonicsView, setHarmonicsView] = useState(false);
  
  // Side panels
  const [showChordDict, setShowChordDict] = useState(false);
  const [chordSearch, setChordSearch] = useState('');
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoEmbedUrl, setVideoEmbedUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inspectedNote, setInspectedNote] = useState(null);

  // AI Theory Assistant
  const [showTheoryPanel, setShowTheoryPanel] = useState(true);
  const [scaleDetection, setScaleDetection] = useState(null); // { rootName, scaleName, confidence }
  const [theoryChordsInScale, setTheoryChordsInScale] = useState([]);
  const [nextNoteSuggestions, setNextNoteSuggestions] = useState([]);
  const [autoDetectScale, setAutoDetectScale] = useState(true);

  // History for undo
  const historyRef = useRef([]);
  const historyPtr = useRef(-1);

  const pushHistory = useCallback((cols) => {
    const snapshot = JSON.stringify(cols);
    // Trim forward history
    historyRef.current = historyRef.current.slice(0, historyPtr.current + 1);
    historyRef.current.push(snapshot);
    historyPtr.current = historyRef.current.length - 1;
  }, []);

  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
      setActiveCol(null);
      pushHistory(initialColumns);
    }
  }, [initialColumns, pushHistory]);

  // Decode ?tab= link param on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        const decoded = JSON.parse(atob(tabParam));
        if (decoded.columns) {
          setColumns(decoded.columns);
          if (decoded.tuningKey) setTuningKey(decoded.tuningKey);
          if (decoded.capo !== undefined) setCapo(decoded.capo);
          if (decoded.scaleName) setScaleName(decoded.scaleName);
          if (decoded.rootName) setRootName(decoded.rootName);
          if (decoded.bpm) setBpm(decoded.bpm);
        }
      }
    } catch (_) {}
  }, []);

  // ── AUTO-DETECT SCALE from columns ──────────────────────────────────────
  useEffect(() => {
    if (!autoDetectScale) return;
    const detected = detectScaleFromColumns(columns, tuningKey);
    setScaleDetection(detected);

    if (detected && detected.confidence > 30) {
      setRootName(detected.rootName);
      setScaleName(detected.scaleName);
    }

    // Compute diatonic chords for the active scale
    const activeRoot = detected?.rootName || rootName;
    const activeScale = detected?.scaleName || scaleName;
    setTheoryChordsInScale(getChordsInScale(activeRoot, activeScale, tuningKey));

    // Suggest next notes from recent MIDI pitches
    const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
    const recentMidis = [];
    const recentCols = columns.slice(-6);
    recentCols.forEach(col => {
      col.notes?.forEach(n => {
        if (!n.isPerc && typeof n.fretIdx === 'number' && typeof n.stringIdx === 'number') {
          recentMidis.push((tuning[n.stringIdx] || 0) + n.fretIdx);
        }
      });
    });
    setNextNoteSuggestions(suggestNextNotes(recentMidis, activeRoot, activeScale));
  }, [columns, autoDetectScale, tuningKey]);

  // ── handlePlayToggle must be defined BEFORE useKeyboardEditorShortcuts ───
  // (const is NOT hoisted — passing it before definition throws TDZ ReferenceError)
  const handlePlayToggle = useCallback(async () => {
    await initAudio();
    if (isPlaying) {
      stopTab();
      setIsPlaying(false);
      setPlayingCol(null);
    } else {
      setIsPlaying(true);
      const startAt = activeCol !== null ? activeCol : 0;
      playTab(columns, bpm, metronomeOn, tuningKey, (colIdx) => {
        setPlayingCol(colIdx);
      }, () => {
        setIsPlaying(false);
        setPlayingCol(null);
      }, startAt, isLooping);
    }
  }, [isPlaying, columns, bpm, metronomeOn, tuningKey, activeCol, isLooping]);



  const tuning = customTuning || TUNINGS[tuningKey] || TUNINGS['Standard'];

  const activeNotes = useMemo(() => {
    if (playingCol !== null && columns[playingCol]) {
      return columns[playingCol].notes || [];
    }
    if (activeCol !== null && columns[activeCol]) {
      return columns[activeCol].notes || [];
    }
    return [];
  }, [playingCol, activeCol, columns]);

  const handleNoteClick = async (stringIdx, fretIdx, midiNote, noteName) => {
    await initAudio();
    playNote(midiNote);

    // Build articulation to apply — validate harmonics against real harmonic frets
    let applyTech = '';
    let applyTechLabel = '';
    if (activeArticulation) {
      const isHarmonicArtic = activeArticulation.tech === '<>';
      if (isHarmonicArtic && !VALID_HARMONIC_FRETS.has(fretIdx)) {
        // Harmonic not valid at this fret — skip the harmonic tech, just place the note normally
        applyTech = '';
        applyTechLabel = '';
      } else {
        applyTech = activeArticulation.tech;
        applyTechLabel = activeArticulation.techLabel;
      }
    }

    setColumns((prev) => {
      const clone = prev.map(c => ({ ...c, notes: c.notes ? [...c.notes] : [] }));
      
      if (activeCol !== null && clone[activeCol]) {
         const col = clone[activeCol];
         if (col.type === 'melody' || col.type === 'chord' || col.type === 'spacer') {
             if (col.type === 'spacer') col.type = 'melody';
             const existingIdx = col.notes.findIndex(n => n.stringIdx === stringIdx && !n.isPerc);
             if (existingIdx > -1) {
                 if (col.notes[existingIdx].fretIdx === fretIdx) {
                    // Clicking same note again: REMOVE it
                    col.notes.splice(existingIdx, 1);
                 } else {
                    col.notes[existingIdx].fretIdx = fretIdx;
                    col.notes[existingIdx].tech = applyTech;
                    col.notes[existingIdx].techLabel = applyTechLabel;
                 }
             } else {
                 col.notes.push({ stringIdx, fretIdx, tech: applyTech, techLabel: applyTechLabel });
             }
             pushHistory(clone);
             // ── AUTO-ADVANCE: create next column and move to it ──────────
             const nextIdx = activeCol + 1;
             if (nextIdx >= clone.length) {
               // Append a fresh spacer column to move into
               clone.push({ id: `col-spacer-${Date.now()}-${Math.random()}`, type: 'spacer', notes: [] });
             }
             setTimeout(() => setActiveCol(nextIdx), 0);
             return clone;
         }
      }
      
      // No active column — create one, select it AND immediately create the next spacer
      const newColIdx = clone.length;
      const newCol = { id: `col-${Date.now()}-${Math.random()}`, type: 'melody', notes: [{ stringIdx, fretIdx, tech: applyTech, techLabel: applyTechLabel }]};
      clone.push(newCol);
      // Append next spacer so user can keep adding
      clone.push({ id: `col-spacer-${Date.now()}-${Math.random()}`, type: 'spacer', notes: [] });
      setTimeout(() => setActiveCol(newColIdx + 1), 0);
      pushHistory(clone);
      return clone;
    });
  };

  // Apply articulation to selected column's notes
  const applyArticulationToSelected = (artic) => {
    if (activeCol === null) { setActiveArticulation(prev => prev?.label === artic.label ? null : artic); return; }
    setColumns(prev => {
      const clone = prev.map(c => ({ ...c, notes: c.notes ? [...c.notes] : [] }));
      if (clone[activeCol]) {
        clone[activeCol].notes = clone[activeCol].notes.map(n => n.isPerc ? n : { ...n, tech: artic.tech, techLabel: artic.techLabel });
      }
      pushHistory(clone);
      return clone;
    });
  };

  const clearTab = () => { setColumns([]); setActiveCol(null); pushHistory([]); };

  const handleSave = () => {
     const payload = { tuningKey, capo, scaleName, rootName, bpm, columns };
     localStorage.setItem('tabcraft_editor_save', JSON.stringify(payload));
     alert('Tab saved to device!');
  };

  const handleLoad = () => {
     const raw = localStorage.getItem('tabcraft_editor_save');
     if (raw) {
         try {
           const data = JSON.parse(raw);
           setColumns(data.columns || []);
           if (data.tuningKey) setTuningKey(data.tuningKey);
           if (data.capo !== undefined) setCapo(data.capo);
           if (data.scaleName) setScaleName(data.scaleName);
           if (data.rootName) setRootName(data.rootName);
           if (data.bpm) setBpm(data.bpm);
           setActiveCol(null);
           pushHistory(data.columns || []);
         } catch(e) { alert('Could not parse saved data.'); }
     } else {
         alert('No saved tabs found on this device.');
     }
  };

  // ── Export / Share ────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    if (columns.length === 0) return;
    exportAsPdf(columns, `TabCraft — ${rootName} ${scaleName}`);
  };

  const handleCopyLink = () => {
    const payload = { tuningKey, capo, scaleName, rootName, bpm, columns };
    const encoded = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}?tab=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  // ── Drop chord from dictionary ────────────────────────────────────────────
  const handleDropChord = (chord) => {
    const notes = chord.notes.map(n => ({ stringIdx: n.s, fretIdx: n.f, tech: '', techLabel: '' }));
    if (activeCol !== null) {
      setColumns(prev => {
        const clone = prev.map(c => ({ ...c, notes: c.notes ? [...c.notes] : [] }));
        clone[activeCol] = { ...clone[activeCol], type: 'chord', notes };
        pushHistory(clone);
        return clone;
      });
    } else {
      setColumns(prev => {
        const newCol = { id: `col-chord-${Date.now()}-${Math.random()}`, type: 'chord', notes };
        const next = [...prev, newCol];
        setTimeout(() => setActiveCol(next.length - 1), 0);
        pushHistory(next);
        return next;
      });
    }
    setShowChordDict(false);
  };

  // ── Magic Wand AI continuation ────────────────────────────────────────────
  const handleMagicWand = () => {
    if (columns.length === 0) return;
    const activePercussives = ['Body Tap', 'String Slap'];
    const extra = generateSolo({ scaleName, rootName, bpm, mood: 'Melodic', complexity: 3, percussiveTechs: activePercussives, tuningKey });
    setColumns(prev => {
      const next = [...prev, ...extra.slice(0, 8)];
      pushHistory(next);
      return next;
    });
  };

  // ── YouTube embed URL ─────────────────────────────────────────────────────
  const handleEmbedVideo = () => {
    let embed = videoUrl;
    const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) embed = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0`;
    setVideoEmbedUrl(embed);
    setShowVideoPanel(true);
  };


  const filteredChords = CHORD_DICT.filter(c => c.name.toLowerCase().includes(chordSearch.toLowerCase()));
  const selectClass = "bg-[#161b22] border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none hover:border-gray-500 transition-colors";

  // ── Keyboard Shortcuts ───────────────────────────────────────────────────
  useKeyboardEditorShortcuts({
    onArrowRight: () => setActiveCol(prev => prev === null ? 0 : Math.min(prev + 1, columns.length - 1)),
    onArrowLeft: () => setActiveCol(prev => prev === null ? 0 : Math.max(prev - 1, 0)),
    onPlayToggle: handlePlayToggle,
    onDelete: (e) => {
      if (activeCol !== null) {
        if (e.ctrlKey || e.metaKey) {
          setColumns(prev => {
            const next = prev.filter((_, i) => i !== activeCol);
            pushHistory(next);
            return next;
          });
          setActiveCol(prev => Math.max(0, prev - 1));
        } else {
          setColumns(prev => {
            const clone = prev.map((c, i) => i === activeCol ? { ...c, notes: [] } : c);
            pushHistory(clone);
            return clone;
          });
        }
      }
    },
    onUndo: () => {
      if (historyPtr.current > 0) {
        historyPtr.current--;
        const prev = JSON.parse(historyRef.current[historyPtr.current]);
        setColumns(prev);
      }
    },
    onMetronomeToggle: () => setMetronomeOn(v => !v),
    onLoopToggle: () => setIsLooping(v => !v),
    onSave: handleSave,
    onClear: clearTab,
    onPdfExport: handleExportPdf,
    onArticSelect: (idx) => {
      if (ARTICULATIONS[idx]) applyArticulationToSelected(ARTICULATIONS[idx]);
    },
    onEscape: () => {
      setActiveCol(null);
      setInspectedNote(null);
      setActiveArticulation(null);
    },
    enabled: true
  });

  return (
    <div className="flex h-full w-full bg-[#0d1117] overflow-hidden animate-fade-in relative flex-col md:flex-row">
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar relative">
      
      {/* VIDEO SYNC PANEL */}
      {showVideoPanel && (
        <div className="fixed bottom-6 right-6 z-[90] bg-[#161b22] border border-gray-700 rounded-xl shadow-2xl overflow-hidden resize"
             style={{ width: 400, minWidth: 280, minHeight: 260 }}>
          <div className="flex items-center justify-between px-3 py-2 bg-[#0d1117] border-b border-gray-800">
            <span className="text-xs font-bold text-gray-300">📹 Video Sync</span>
            <button onClick={() => setShowVideoPanel(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>
          {videoEmbedUrl ? (
            <iframe src={videoEmbedUrl} className="w-full" style={{ height: 220 }} frameBorder="0" allowFullScreen title="Video Sync" />
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-gray-400">Paste a YouTube URL to embed it here and study techniques alongside your tab.</p>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-[#58a6ff]" />
              <button onClick={handleEmbedVideo} className="py-2 bg-[#58a6ff] text-[#0d1117] font-bold rounded text-sm">Embed Video</button>
            </div>
          )}
          {videoEmbedUrl && (
            <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-2">
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="New URL..." className="flex-1 bg-[#0d1117] border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 outline-none" />
              <button onClick={handleEmbedVideo} className="text-xs px-2 py-1 bg-[#58a6ff]/20 text-[#58a6ff] rounded border border-[#58a6ff]/30">Load</button>
            </div>
          )}
        </div>
      )}

      {/* CHORD DICTIONARY PANEL */}
      {showChordDict && (
        <div className="fixed right-6 top-24 z-[90] bg-[#161b22] border border-[#58a6ff]/30 rounded-xl shadow-2xl w-72 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-bold text-[#58a6ff]">🎵 Chord Dictionary</span>
            <button onClick={() => setShowChordDict(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>
          <div className="px-3 py-2 border-b border-gray-800">
            <input value={chordSearch} onChange={e => setChordSearch(e.target.value)} placeholder="Search chord..."
              className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-[#58a6ff]" />
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-1">
            {filteredChords.map(chord => (
              <button key={chord.name} onClick={() => handleDropChord(chord)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#58a6ff]/10 border border-transparent hover:border-[#58a6ff]/30 transition-all group">
                <span className="font-bold text-gray-200 group-hover:text-[#58a6ff] transition-colors">{chord.name}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {chord.notes.map(n => `${n.s}:${n.f}`).join(' ')}
                </span>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
            {activeCol !== null ? `→ Drop into column ${activeCol + 1}` : '→ Will add as new column'}
          </div>
        </div>
      )}

      {/* CUSTOM TUNING DIALOG */}
      {showCustomTuningDialog && (
        <CustomTuningDialog
          onSave={(values) => {
            setCustomTuning(values);
            setTuningKey('Custom');
            setShowCustomTuningDialog(false);
          }}
          onClose={() => setShowCustomTuningDialog(false)}
        />
      )}

      {/* ── TOOLBAR TOP ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between xl:justify-start gap-3 mb-5 pb-4 border-b border-gray-800 flex-wrap">
        <h2 className="text-3xl font-bold text-[#58a6ff] mr-4">Editor</h2>
        
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Capo</label>
          <select value={capo} onChange={(e) => setCapo(Number(e.target.value))} className={selectClass}>
            {Array.from({ length: 13 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Off' : `Fret ${i}`}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Tuning</label>
          <select
            value={tuningKey}
            onChange={(e) => {
              if (e.target.value === 'Custom') { setShowCustomTuningDialog(true); return; }
              setTuningKey(e.target.value); setCustomTuning(null);
            }}
            className={selectClass}
          >
            {Object.keys(TUNINGS).map(key => <option key={key} value={key}>{key}</option>)}
            <option value="Custom">✏️ Custom...</option>
          </select>
          {customTuning && (
            <button onClick={() => setShowCustomTuningDialog(true)} className="text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 px-2 py-1 rounded">Edit</button>
          )}
        </div>

        <div className="w-px h-6 bg-gray-800 mx-1 hidden xl:block" />

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Root</label>
          <select value={rootName} onChange={(e) => setRootName(e.target.value)} className={selectClass}>
            {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Scale</label>
          <select value={scaleName} onChange={(e) => setScaleName(e.target.value)} className={selectClass}>
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-800 mx-1 hidden xl:block" />

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowChordDict(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-md border font-bold transition-all ${showChordDict ? 'bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
            title="Chord Dictionary (Cmd+K)">
            🎵 Chords
          </button>
          <button onClick={handleMagicWand} disabled={columns.length === 0}
            className="text-xs px-3 py-1.5 rounded-md border font-bold border-purple-500/40 text-purple-300 hover:bg-purple-500/15 disabled:opacity-40 transition-all"
            title="Magic Wand — AI continuation">
            ✨ Extend
          </button>
          <button onClick={() => setShowVideoPanel(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-md border font-bold transition-all ${showVideoPanel ? 'bg-green-500/20 border-green-500 text-green-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
            title="Video Sync Panel">
            📹 Video
          </button>
          <button onClick={() => setShowTheoryPanel(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-md border font-bold transition-all ${showTheoryPanel ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}
            title="AI Theory Assistant">
            🧠 Theory
          </button>
        </div>
      </div>

      {/* ── ARTICULATION PANEL ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs text-gray-500 font-bold uppercase mr-1">Articulation:</span>
        {ARTICULATIONS.map(artic => (
          <button
            key={artic.label}
            onClick={() => applyArticulationToSelected(artic)}
            title={artic.title}
            className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border transition-all hover:scale-105 active:scale-95 ${
              activeArticulation?.label === artic.label
                ? 'shadow-[0_0_8px_var(--ac)]'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
            }`}
            style={{
              color: artic.color,
              borderColor: activeArticulation?.label === artic.label ? artic.color : undefined,
              background: activeArticulation?.label === artic.label ? artic.color + '22' : undefined,
              '--ac': artic.color,
            }}
          >
            {artic.label}
            <span className="ml-1 text-[10px] opacity-70 normal-case font-normal hidden sm:inline">{artic.title.split(' ')[0]}</span>
          </button>
        ))}
        {activeArticulation && (
          <button onClick={() => setActiveArticulation(null)}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white border border-gray-700 ml-1">
            Clear
          </button>
        )}
        <div className="ml-auto text-xs text-gray-600 hidden xl:block">
          ← → navigate · Space play · Del clear column · Ctrl+Z undo
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center">
        <div className="sticky top-0 z-50 w-full bg-[#0d1117]/95 backdrop-blur-md pt-2 pb-6 border-b border-gray-800/50 flex flex-col items-center">
          <Fretboard 
            tuning={tuning} 
            capo={capo} 
            onNoteClick={handleNoteClick} 
            scaleName={scaleName}
            rootName={rootName}
            activeNotes={activeNotes}
            harmonicsView={harmonicsView}
            onHarmonicsViewToggle={() => setHarmonicsView(v => !v)}
            harmonicArtic={activeArticulation?.tech === '<>'}
          />
        </div>

        <div className="mt-8 w-full flex-grow flex flex-col">
          {/* TAB TOOLBAR */}
          <div className="flex items-center justify-between mb-4 bg-[#151a22] p-4 rounded-lg border border-gray-800 flex-wrap gap-3">
             <div className="flex items-center space-x-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-gray-300">Tab Sequence</h3>
                
                <div className="flex items-center space-x-3 border-l border-gray-700 pl-4">
                   <button 
                      onClick={handlePlayToggle}
                      className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-bold active:scale-95 transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                   >
                     {isPlaying ? (
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="4" width="3" height="12" rx="1"/><rect x="12" y="4" width="3" height="12" rx="1"/></svg>
                     ) : (
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                     )}
                     <span>{isPlaying ? 'Stop' : 'Play'}</span>
                   </button>

                   <div className="flex items-center space-x-2 text-sm">
                     <span className="text-gray-500 font-medium">BPM</span>
                     <input type="number" min="40" max="240" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-16 bg-transparent border-b border-gray-600 text-center text-gray-300 outline-none focus:border-[#58a6ff] font-mono" />
                   </div>

                   <button 
                      onClick={() => setIsLooping(!isLooping)}
                      className={`px-3 py-2 rounded text-xs font-bold transition-all ${isLooping ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                      title="Loop playback"
                   >
                     {isLooping ? '🔁 Loop On' : '🔁 Loop Off'}
                   </button>

                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input type="checkbox" checked={metronomeOn} onChange={e => setMetronomeOn(e.target.checked)} className="w-4 h-4 accent-[#58a6ff] cursor-pointer" />
                     <span className="text-sm text-gray-400 font-medium">Metronome</span>
                   </label>
                </div>
             </div>
             
             <div className="flex items-center gap-2 flex-wrap">
               <button onClick={handleLoad} className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2 rounded-md bg-gray-800/50 hover:bg-gray-700 active:scale-95 transition-all border border-gray-700">Load</button>
               <button onClick={handleSave} disabled={columns.length === 0} className="text-xs font-bold text-[#58a6ff] px-3 py-2 rounded-md bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 active:scale-95 transition-all disabled:opacity-40 border border-[#58a6ff]/30">Save</button>
               <button onClick={handleExportPdf} disabled={columns.length === 0} className="text-xs font-bold text-red-400 px-3 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-40 border border-red-500/30 flex items-center gap-1">
                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
                 PDF
               </button>
               <button onClick={handleCopyLink} disabled={columns.length === 0}
                 className={`text-xs font-bold px-3 py-2 rounded-md active:scale-95 transition-all disabled:opacity-40 border flex items-center gap-1 ${linkCopied ? 'bg-green-500/20 border-green-500 text-green-400' : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'}`}>
                 {linkCopied ? '✓ Copied!' : '🔗 Share'}
               </button>
               <button onClick={clearTab} className="text-xs font-bold text-gray-400 hover:text-red-400 px-3 py-2 rounded-md bg-gray-800/50 hover:bg-gray-800 active:scale-95 border border-transparent hover:border-red-500/50 transition-all">Clear</button>
             </div>
          </div>
          
          {/* ── AI THEORY ASSISTANT PANEL ────────────────────────────────── */}
          {showTheoryPanel && (
            <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 mb-4 mt-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🧠</span>
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">AI Theory Assistant</h3>
                  {scaleDetection && scaleDetection.confidence > 30 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold">
                      AUTO-DETECTED · {scaleDetection.confidence}% conf
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoDetectScale} onChange={e => setAutoDetectScale(e.target.checked)} className="w-3.5 h-3.5 accent-purple-400 cursor-pointer" />
                  <span className="text-xs text-gray-400">Auto-detect</span>
                </label>
              </div>

              {/* Detected Scale Info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Root</p>
                  <p className="text-lg font-bold text-[#58a6ff] mt-0.5">{rootName}</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Scale</p>
                  <p className="text-sm font-bold text-purple-400 mt-1 truncate">{scaleName}</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Notes in Scale</p>
                  <p className="text-xs font-mono text-gray-300 mt-1">
                    {(SCALES[scaleName] || SCALES.Major).map(i => NOTE_NAMES[(NOTE_NAMES.indexOf(rootName) + i) % 12]).join(' ')}
                  </p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold">Total Notes</p>
                  <p className="text-lg font-bold text-gray-200 mt-0.5">
                    {columns.reduce((acc, col) => acc + (col.notes?.filter(n => !n.isPerc && typeof n.fretIdx === 'number').length || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Diatonic Chords in Scale */}
              {theoryChordsInScale.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chords in {rootName} {scaleName}</p>
                  <div className="flex flex-wrap gap-2">
                    {theoryChordsInScale.map((chord, i) => (
                      <button key={i} onClick={() => handleDropChord({ name: chord.name, notes: chord.notes })}
                        className="group flex flex-col items-center gap-0.5 px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-lg hover:border-purple-500/50 hover:bg-purple-500/10 transition-all active:scale-95 cursor-pointer min-w-[56px]">
                        <span className="text-xs text-gray-500 font-mono">{chord.romanNumeral}</span>
                        <span className="text-sm font-bold text-gray-200 group-hover:text-purple-300 transition-colors">{chord.name}</span>
                        <span className="text-[9px] text-gray-600">{chord.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Next Notes */}
              {nextNoteSuggestions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">✨ Suggested Next Notes</p>
                  <div className="flex gap-2">
                    {nextNoteSuggestions.map((s, i) => (
                      <div key={i} className={`px-3 py-2 rounded-lg border text-center min-w-[44px] ${
                        i === 0 ? 'bg-green-500/15 border-green-500/50 shadow-[0_0_8px_rgba(74,222,128,0.15)]' :
                        i === 1 ? 'bg-[#58a6ff]/10 border-[#58a6ff]/40' :
                        'bg-[#0d1117] border-gray-700'
                      }`}>
                        <p className={`text-sm font-bold font-mono ${i === 0 ? 'text-green-400' : i === 1 ? 'text-[#58a6ff]' : 'text-gray-400'}`}>{s.note}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">{i === 0 ? 'Best' : i === 1 ? 'Good' : 'Fits'}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 italic">Based on stepwise motion, chord tones, and melodic tendency analysis</p>
                </div>
              )}

              {!scaleDetection && columns.length > 0 && (
                <p className="text-xs text-gray-500 italic">Add 3+ distinct notes to trigger auto-detection…</p>
              )}
              {columns.length === 0 && (
                <p className="text-xs text-gray-500 italic">Start placing notes on the fretboard to get scale + chord suggestions…</p>
              )}
            </div>
          )}

          {columns.length === 0 ? (
             <div className="flex-grow border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center bg-[#0d1117]/50 mt-4 min-h-[180px]">
                <div className="text-center space-y-2">
                  <p className="text-gray-500 font-medium italic text-lg tracking-wide">Click frets to build chords, or load a saved tab...</p>
                  <p className="text-xs text-gray-600">Tip: Use ← → arrow keys to navigate, Space to play, Ctrl+Z to undo</p>
                </div>
             </div>
          ) : (
             <TabViewer 
               columns={columns} 
               setColumns={setColumns} 
               editable={true} 
               activeCol={activeCol} 
               onColSelect={(i) => {
                  setActiveCol(i);
                  // Default inspect top note of column if clicking column
                  if (i !== null && columns[i]?.notes?.[0]) {
                     setInspectedNote(columns[i].notes[0]);
                  } else {
                     setInspectedNote(null);
                  }
               }} 
               playingCol={playingCol}
               tuning={customTuning || TUNINGS[tuningKey] || TUNINGS['Standard']}
               capo={capo}
             />
          )}
        </div>
      </div>
      </div>

      {/* Desktop Sidebar Note Inspector */}
      {inspectedNote && (
         <div className="hidden lg:flex shrink-0">
           <NoteInspector 
              note={inspectedNote} 
              onClose={() => setInspectedNote(null)}
              onSwapAlternative={(alt) => {
                 setColumns(prev => {
                    const clone = [...prev];
                    if (activeCol !== null && clone[activeCol]) {
                       const noteIdx = clone[activeCol].notes.findIndex(n => n === inspectedNote);
                       if (noteIdx > -1) {
                         clone[activeCol].notes[noteIdx].fretIdx = alt.fretIdx;
                         clone[activeCol].notes[noteIdx].stringIdx = alt.stringIdx;
                         setInspectedNote({ ...clone[activeCol].notes[noteIdx] });
                       }
                    }
                    pushHistory(clone);
                    return clone;
                 });
              }}
           />
         </div>
      )}

      {/* Mobile Drawer Note Inspector */}
      {inspectedNote && (
         <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#161b22] border-t border-gray-800 shadow-2xl max-h-[60vh] overflow-hidden rounded-t-2xl flex flex-col">
           <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />
           <div className="flex-1 overflow-y-auto">
             <NoteInspector 
                note={inspectedNote} 
                onClose={() => setInspectedNote(null)}
                onSwapAlternative={(alt) => {
                   setColumns(prev => {
                      const clone = [...prev];
                      if (activeCol !== null && clone[activeCol]) {
                         const noteIdx = clone[activeCol].notes.findIndex(n => n === inspectedNote);
                         if (noteIdx > -1) {
                           clone[activeCol].notes[noteIdx].fretIdx = alt.fretIdx;
                           clone[activeCol].notes[noteIdx].stringIdx = alt.stringIdx;
                           setInspectedNote({ ...clone[activeCol].notes[noteIdx] });
                         }
                      }
                      pushHistory(clone);
                      return clone;
                   });
                }}
             />
           </div>
         </div>
      )}
    </div>
  );
}
