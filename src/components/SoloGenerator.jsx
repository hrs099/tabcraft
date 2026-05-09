import React, { useState, useEffect, useRef } from 'react';
import TabViewer from './TabViewer';
import Fretboard from './Fretboard';
import { SCALES, NOTE_NAMES, TUNINGS, HARMONIC_NODES } from '../utils/music';
import { generateSolo, generatePercFill, STYLE_PRESETS, PERC_LABELS } from '../utils/generator';
import { initAudio, playTab, stopTab, playNote } from '../utils/playback';

const MOODS = ['Calm', 'Melodic', 'Aggressive', 'Emotional', 'Playful'];
const PERCUSSIVES = Object.keys(PERC_LABELS);

const CHORD_ROOTS = NOTE_NAMES;
const CHORD_QUALITIES = ['maj', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', '5'];

const VIRTUOSO_LABELS = ['Beginner', 'Learner', 'Intermediate', 'Advanced', 'Virtuoso'];

// ─── Solo Library Helper ────────────────────────────────────────────────────
const LIBRARY_KEY = 'tabcraft_solo_library';

function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]'); } catch { return []; }
}
function saveLibrary(items) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
}

// ─── Mini Scale Fretboard ───────────────────────────────────────────────────
function MiniFretboard({ scaleName, rootName, tuningKey }) {
  const frets = Array.from({ length: 13 }, (_, i) => i);
  const tuning = TUNINGS[tuningKey] || TUNINGS['Standard'];
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  const intervals = SCALES[scaleName] || SCALES.Major;
  const harmonicFrets = new Set(HARMONIC_NODES.map(h => h.fret));
  
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex flex-col bg-[#0d1117] p-3 rounded-lg border border-gray-800 min-w-max">
        <div className="flex mb-1 ml-[28px]">
          {frets.map(f => <div key={f} className="w-[32px] text-center text-[9px] text-gray-600 font-bold">{f}</div>)}
        </div>
        <div className="relative border-l-[4px] border-l-gray-400">
          {[0,1,2,3,4,5].map(sIdx => {
            const open = tuning[sIdx];
            return (
              <div key={sIdx} className="flex items-center h-[22px] relative">
                <div className="absolute left-0 right-0 top-1/2 bg-gray-500/40" style={{ height: 1 + sIdx * 0.3 }} />
                <div className="w-[28px] text-center text-[9px] text-[#58a6ff] font-bold z-10 bg-[#0d1117]">
                  {NOTE_NAMES[(open) % 12]}
                </div>
                {frets.map(fret => {
                  const midi = open + fret;
                  const pc = (midi - rootIdx + 144) % 12;
                  const isScale = intervals.includes(pc);
                  const isRoot = pc === 0;
                  const isHarm = harmonicFrets.has(fret);
                  return (
                    <div key={fret} className="w-[32px] h-full flex items-center justify-center relative z-10">
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-700/50" />
                      {isScale && (
                        <div className={`w-[16px] h-[16px] rounded-full text-[8px] flex items-center justify-center font-bold ${
                          isRoot ? 'bg-yellow-400 text-black' : isHarm ? 'bg-amber-600/80 text-white' : 'bg-[#58a6ff] text-[#0d1117]'
                        }`}>
                          {isRoot ? 'R' : '·'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Chord Progression Builder ──────────────────────────────────────────────
function ChordProgressionBuilder({ progression, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chord Progression</label>
        <button onClick={() => onChange(progression.length < 8 ? [...progression, { root: 'C', quality: 'maj' }] : progression)}
          className="text-xs px-2 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30 hover:bg-[#58a6ff]/20">+ Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {progression.map((chord, i) => (
          <div key={i} className="flex items-center gap-1 bg-[#0d1117] border border-gray-700 rounded-lg px-2 py-1">
            <select value={chord.root} onChange={e => { const p=[...progression]; p[i]={...p[i],root:e.target.value}; onChange(p); }}
              className="bg-transparent text-xs text-gray-200 outline-none">
              {CHORD_ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={chord.quality} onChange={e => { const p=[...progression]; p[i]={...p[i],quality:e.target.value}; onChange(p); }}
              className="bg-transparent text-xs text-gray-400 outline-none">
              {CHORD_QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            <button onClick={() => onChange(progression.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 text-xs ml-1">✕</button>
          </div>
        ))}
        {progression.length === 0 && <p className="text-xs text-gray-600 italic">No chords set — generator will freely explore the scale</p>}
      </div>
    </div>
  );
}

export default function SoloGenerator({ onOpenInEditor }) {
  const [scaleName, setScaleName] = useState('Major');
  const [rootName, setRootName] = useState('C');
  const [tempo, setTempo] = useState(120);
  const [mood, setMood] = useState('Melodic');
  const [complexity, setComplexity] = useState(3);
  const [tuningKey, setTuningKey] = useState('Standard');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [percussives, setPercussives] = useState({});
  const [forceHarmonicNodes, setForceHarmonicNodes] = useState(false);
  const [chordProgression, setChordProgression] = useState([]);
  const [percFillMode, setPercFillMode] = useState(false);
  const [percFillBars, setPercFillBars] = useState(1);
  const [showRagaExplorer, setShowRagaExplorer] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [harmonicsView, setHarmonicsView] = useState(false);

  const [columns, setColumns] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCol, setPlayingCol] = useState(null);
  const [library, setLibrary] = useState(loadLibrary);

  const togglePercussive = (p) => setPercussives(prev => ({ ...prev, [p]: !prev[p] }));

  // Apply a style preset
  const applyPreset = (presetName) => {
    const preset = STYLE_PRESETS[presetName];
    if (!preset) return;
    setSelectedStyle(presetName);
    if (SCALES[preset.scaleName]) setScaleName(preset.scaleName);
    setRootName(preset.rootName);
    setComplexity(preset.complexity);
    setMood(preset.mood);
    const percs = {};
    preset.percussiveTechs.forEach(p => { percs[p] = true; });
    setPercussives(percs);
  };

  const handleGenerate = () => {
    let generated;
    if (percFillMode) {
      const activePercussives = Object.keys(percussives).filter(p => percussives[p]);
      generated = generatePercFill(activePercussives, percFillBars);
    } else {
      const activePercussives = Object.keys(percussives).filter(p => percussives[p]);
      const chordRoots = chordProgression.map(c => c.root);
      generated = generateSolo({
        scaleName, rootName, tempo, mood, complexity,
        percussiveTechs: activePercussives,
        tuningKey: tuningKey,
        forceHarmonicNodes,
        chordProgression: chordRoots,
      });
    }
    setColumns(generated);
    
    // Auto-save to library
    const entry = {
      id: Date.now(),
      label: selectedStyle || `${rootName} ${scaleName}`,
      rootName, scaleName, mood, complexity, tempo,
      tuningKey,
      forceHarmonicNodes,
      percFillMode,
      columns: generated,
      createdAt: new Date().toISOString(),
      favorite: false,
    };
    const updated = [entry, ...loadLibrary()].slice(0, 50);
    saveLibrary(updated);
    setLibrary(updated);
  };

  const handlePlayToggle = async () => {
    await initAudio();
    if (isPlaying) {
      stopTab();
      setIsPlaying(false);
      setPlayingCol(null);
    } else {
      setIsPlaying(true);
      playTab(columns, tempo, false, tuningKey, (colIdx) => {
        setPlayingCol(colIdx);
      }, () => {
        setIsPlaying(false);
        setPlayingCol(null);
      });
    }
  };

  const handleSave = () => {
     localStorage.setItem('tabcraft_editor_save', JSON.stringify({ columns, tuningKey, scaleName, rootName, bpm: tempo }));
     alert('Saved to device!');
  };

  const toggleFavorite = (id) => {
    const updated = library.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e);
    saveLibrary(updated);
    setLibrary(updated);
  };
  
  const deleteFromLibrary = (id) => {
    const updated = library.filter(e => e.id !== id);
    saveLibrary(updated);
    setLibrary(updated);
  };

  const reloadFromLibrary = (entry) => {
    setColumns(entry.columns);
    setScaleName(entry.scaleName);
    setRootName(entry.rootName);
    if (entry.tuningKey) setTuningKey(entry.tuningKey);
    setMood(entry.mood);
    setComplexity(entry.complexity);
    setTempo(entry.tempo);
    setShowLibrary(false);
  };

  const activeNotes = [];
  if (playingCol !== null && columns[playingCol]) {
    const col = columns[playingCol];
    if (col.notes) {
      col.notes.forEach(n => {
        if (!n.isPerc && typeof n.fretIdx === 'number') {
          activeNotes.push({ stringIdx: n.stringIdx, fretIdx: n.fretIdx });
        }
      });
    }
  }

  const btn = (label, active, onClick, color = '[#58a6ff]') =>
    <button onClick={onClick} className={`text-xs py-2 px-3 rounded-md border transition-all hover:scale-[1.02] active:scale-95 ${active ? `bg-${color}/15 border-${color} text-${color} shadow-[0_0_8px_rgba(88,166,255,0.15)]` : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>{label}</button>;

  return (
    <div className="flex h-full w-full bg-[#0d1117] text-gray-200 overflow-hidden animate-fade-in">
      
      {/* ── PAST SOLO LIBRARY OVERLAY ──────────────────────────────────── */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex justify-end" onClick={() => setShowLibrary(false)}>
          <div className="w-96 bg-[#161b22] border-l border-gray-800 flex flex-col h-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-[#58a6ff]">📚 Past Solo Library</h3>
              <button onClick={() => setShowLibrary(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {library.length === 0 && (
                <p className="text-gray-500 italic text-sm text-center mt-12">Generate solos to populate your library.</p>
              )}
              {library.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).map(entry => (
                <div key={entry.id} className="bg-[#0d1117] border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-200 text-sm truncate">{entry.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{entry.rootName} {entry.scaleName} · {entry.mood} · {entry.tempo} BPM · Virtuoso {entry.complexity}</p>
                      <p className="text-xs text-gray-600">{entry.columns?.length} columns · {new Date(entry.createdAt).toLocaleDateString()}</p>
                      {entry.forceHarmonicNodes && <span className="text-[10px] text-amber-400 font-bold">◇ Harmonic</span>}
                      {entry.percFillMode && <span className="text-[10px] text-orange-400 font-bold ml-2">🥁 Perc Fill</span>}
                    </div>
                    <button onClick={() => toggleFavorite(entry.id)} className={`text-lg leading-none ml-2 ${entry.favorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}>
                      {entry.favorite ? '★' : '☆'}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => reloadFromLibrary(entry)} className="flex-1 text-xs py-1.5 bg-[#58a6ff]/10 text-[#58a6ff] rounded border border-[#58a6ff]/30 hover:bg-[#58a6ff]/20 font-bold transition-all">Reload</button>
                    <button onClick={() => onOpenInEditor && onOpenInEditor(entry.columns)} className="flex-1 text-xs py-1.5 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700 transition-all">Edit</button>
                    <button onClick={() => deleteFromLibrary(entry.id)} className="px-2 text-xs py-1.5 text-red-400 hover:text-red-300 border border-transparent hover:border-red-500/30 rounded transition-all">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LEFT DASHBOARD */}
      <div className="w-[30%] min-w-[320px] bg-[#161b22] border-r border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#58a6ff] tracking-wide">Solo Engine</h2>
            <p className="text-xs text-gray-500 mt-0.5">Algorithmic Composer</p>
          </div>
          <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-700 text-gray-400 hover:text-[#58a6ff] hover:border-[#58a6ff]/50 rounded-full transition-all">
            📚 Library ({library.length})
          </button>
        </div>

        <div className="p-5 space-y-4 flex-grow">
          
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setPercFillMode(false)} className={`flex-1 text-xs py-2 rounded-md border font-bold transition-all ${!percFillMode ? 'bg-[#58a6ff]/15 border-[#58a6ff] text-[#58a6ff]' : 'border-gray-700 text-gray-400'}`}>🎸 Solo</button>
            <button onClick={() => setPercFillMode(true)} className={`flex-1 text-xs py-2 rounded-md border font-bold transition-all ${percFillMode ? 'bg-orange-500/15 border-orange-500 text-orange-400' : 'border-gray-700 text-gray-400'}`}>🥁 Perc Fill</button>
          </div>

          {percFillMode ? (
            <div className="space-y-3 bg-[#0d1117] rounded-lg border border-gray-800 p-4">
              <p className="text-xs text-gray-400 font-bold uppercase">Percussive Fill Generator</p>
              <p className="text-xs text-gray-500">Generates intricate percussion-only patterns to insert between melodic phrases.</p>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 whitespace-nowrap">Bars:</label>
                <input type="range" min="1" max="4" value={percFillBars} onChange={e => setPercFillBars(Number(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-xs text-orange-400 font-mono w-4">{percFillBars}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Style Presets */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">In the Style of…</label>
                <select value={selectedStyle} onChange={e => applyPreset(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors text-gray-200">
                  <option value="">— Choose a style preset —</option>
                  {Object.keys(STYLE_PRESETS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <hr className="border-gray-800" />

              {/* Root & Scale */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Tuning</label>
                  <select value={tuningKey} onChange={e => setTuningKey(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors">
                    {Object.keys(TUNINGS).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Root Note</label>
                  <select value={rootName} onChange={e => setRootName(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors">
                    {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Scale / Mode / Raga</label>
                  <select value={scaleName} onChange={e => setScaleName(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors">
                    {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                {/* Raga Explorer toggle */}
                <button onClick={() => setShowRagaExplorer(v => !v)} className={`w-full text-xs py-1.5 rounded-md border font-bold transition-all ${showRagaExplorer ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-400'}`}>
                  {showRagaExplorer ? '▲ Hide' : '▼ Show'} Scale Explorer
                </button>
                {showRagaExplorer && (
                  <div className="rounded-lg overflow-hidden border border-gray-800">
                    <MiniFretboard scaleName={scaleName} rootName={rootName} tuningKey={tuningKey} />
                    <p className="text-[10px] text-gray-600 px-3 py-1.5">Yellow = Root · Blue = Scale · Amber = Harmonic Node</p>
                  </div>
                )}
              </div>

              <hr className="border-gray-800" />

              {/* Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tempo</label>
                    <span className="text-xs text-[#58a6ff] font-mono">{tempo} BPM</span>
                  </div>
                  <input type="range" min="60" max="180" value={tempo} onChange={e => setTempo(Number(e.target.value))} className="w-full accent-[#58a6ff]" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Virtuoso Level</label>
                    <span className="text-xs text-[#58a6ff] font-mono">{VIRTUOSO_LABELS[complexity - 1]}</span>
                  </div>
                  <input type="range" min="1" max="5" value={complexity} onChange={e => setComplexity(Number(e.target.value))} className="w-full accent-[#58a6ff]" />
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5 px-0.5">
                    {VIRTUOSO_LABELS.map(l => <span key={l}>{l}</span>)}
                  </div>
                </div>
              </div>

              <hr className="border-gray-800" />

              {/* Mood */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Mood / Vibe</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOODS.map(m => (
                    <button key={m} onClick={() => setMood(m)} className={`text-xs py-2 rounded-md border transition-all hover:scale-[1.02] active:scale-95 ${mood === m ? 'bg-[#58a6ff]/15 border-[#58a6ff] text-[#58a6ff] shadow-[0_0_8px_rgba(88,166,255,0.15)]' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-gray-800" />

              {/* Chord Progression Builder */}
              <ChordProgressionBuilder progression={chordProgression} onChange={setChordProgression} />

              <hr className="border-gray-800" />

              {/* Harmonic Node Toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={forceHarmonicNodes} onChange={e => setForceHarmonicNodes(e.target.checked)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
                <div>
                  <span className={`text-sm font-bold ${forceHarmonicNodes ? 'text-amber-400' : 'text-gray-400 group-hover:text-gray-300'}`}>◇ Harmonic Node Mapping</span>
                  <p className="text-xs text-gray-600">Forces notes at frets 5, 7, 12, 19 with &lt;&gt; notation</p>
                </div>
              </label>

              <hr className="border-gray-800" />

              {/* Percussive Techniques */}
              <div>
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Percussive Techniques</label>
                 <div className="space-y-2">
                   {PERCUSSIVES.map(p => (
                     <label key={p} className="flex items-center space-x-3 cursor-pointer group">
                       <input type="checkbox" checked={!!percussives[p]} onChange={() => togglePercussive(p)} className="w-4 h-4 accent-[#58a6ff] cursor-pointer" />
                       <span className={`text-sm font-medium ${percussives[p] ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'}`}>
                         {p}
                         {['Advanced Harmonics','Artificial Harmonics','2-Hand Tapping'].includes(p) && (
                           <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">NEW</span>
                         )}
                       </span>
                     </label>
                   ))}
                 </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 bg-[#0d1117] border-t border-gray-800">
          <button onClick={handleGenerate}
            className={`w-full py-4 font-bold rounded-lg shadow-lg transition-all hover:-translate-y-[1px] active:translate-y-0 active:scale-95 uppercase tracking-wider ${
              percFillMode
                ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/30'
                : 'bg-[#58a6ff] hover:bg-[#4a8ce0] text-[#0d1117] shadow-[#58a6ff]/30'
            }`}
          >
            {percFillMode ? '🥁 Generate Perc Fill' : '⚡ Generate Solo'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-[#0d1117] p-5 overflow-y-auto custom-scrollbar">
        {/* Top actions */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
           <div>
             <h2 className="text-xl font-bold text-gray-200">
               {percFillMode ? '🥁 Percussive Fill' : '⚡ Generated Sequence'}
             </h2>
             <p className="text-gray-500 text-sm mt-0.5">{columns.length > 0 ? `${columns.length} columns` : 'Waiting for generation...'}</p>
           </div>

           <div className="flex space-x-2 flex-wrap gap-2">
             <button onClick={handlePlayToggle} disabled={columns.length === 0}
               className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold active:scale-95 transition-all disabled:opacity-40 ${isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
             >
               {isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="4" width="3" height="12" rx="1"/><rect x="12" y="4" width="3" height="12" rx="1"/></svg>
                           : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>}
               <span>{isPlaying ? 'Stop' : 'Play'}</span>
             </button>

             <button onClick={handleSave} disabled={columns.length === 0}
               className="px-4 py-2 bg-gray-800 text-[#58a6ff] font-bold text-sm rounded-md hover:bg-gray-700 active:scale-95 disabled:opacity-40 transition-all border border-gray-700">
               Save
             </button>

             <button onClick={() => onOpenInEditor && onOpenInEditor(columns)} disabled={columns.length === 0}
               className="flex items-center space-x-2 px-4 py-2 bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/50 rounded-md hover:bg-[#58a6ff]/30 active:scale-95 disabled:opacity-40 transition-all hover:shadow-[0_0_10px_rgba(88,166,255,0.2)]">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
               <span className="text-sm font-bold">Open in Editor</span>
             </button>
           </div>
        </div>

        {/* Fretboard visualizer */}
        <div className="mb-5">
          <Fretboard
            tuning={TUNINGS[tuningKey] || TUNINGS['Standard']}
            capo={0}
            onNoteClick={async (stringIdx, fretIdx, actualMidi) => {
              await initAudio();
              playNote(actualMidi);
            }}
            scaleName={scaleName}
            rootName={rootName}
            activeNotes={activeNotes}
            harmonicsView={harmonicsView}
            onHarmonicsViewToggle={() => setHarmonicsView(v => !v)}
          />
        </div>

        {/* Tab output */}
        <div className="flex-grow">
           <TabViewer columns={columns} playingCol={playingCol} tuning={TUNINGS[tuningKey]} />
        </div>
      </div>
    </div>
  );
}
