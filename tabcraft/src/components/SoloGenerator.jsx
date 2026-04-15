import React, { useState } from 'react';
import TabViewer from './TabViewer';
import Fretboard from './Fretboard';
import { SCALES, NOTE_NAMES, TUNINGS } from '../utils/music';
import { generateSolo } from '../utils/generator';
import { initAudio, playTab, stopTab } from '../utils/playback';

const MOODS = ['Calm', 'Melodic', 'Aggressive', 'Emotional', 'Playful'];
const PERCUSSIVES = ['Kick Drum (Wrist)', 'Snare (Thumb Slap)', 'String Slap', 'Body Tap', 'Nail Attack'];

export default function SoloGenerator({ onOpenInEditor }) {
  const [scaleName, setScaleName] = useState('Major');
  const [rootName, setRootName] = useState('C');
  const [tempo, setTempo] = useState(120);
  const [mood, setMood] = useState('Melodic');
  const [complexity, setComplexity] = useState(3);
  
  const [percussives, setPercussives] = useState({});
  const [columns, setColumns] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCol, setPlayingCol] = useState(null);

  const togglePercussive = (p) => setPercussives(prev => ({ ...prev, [p]: !prev[p] }));

  const handleGenerate = () => {
    const activePercussives = Object.keys(percussives).filter(p => percussives[p]);
    const generated = generateSolo({
      scaleName, rootName, tempo, mood, complexity,
      percussiveTechs: activePercussives,
      tuningKey: 'Standard'
    });
    setColumns(generated);
  };

  const handlePlayToggle = async () => {
    await initAudio();
    if (isPlaying) {
      stopTab();
      setIsPlaying(false);
      setPlayingCol(null);
    } else {
      setIsPlaying(true);
      playTab(columns, tempo, false, 'Standard', (colIdx) => {
        setPlayingCol(colIdx);
      }, () => {
        setIsPlaying(false);
        setPlayingCol(null);
      });
    }
  };

  const handleSave = () => {
     localStorage.setItem('tabcraft_editor_save', JSON.stringify({ columns, tuningKey: 'Standard', scaleName, rootName, bpm: tempo }));
     alert('Saved to device!');
  };

  // Derive active fretboard notes from currently playing column
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

  return (
    <div className="flex h-full w-full bg-[#0d1117] text-gray-200 overflow-hidden animate-fade-in">
      
      {/* LEFT DASHBOARD */}
      <div className="w-[30%] min-w-[320px] bg-[#161b22] border-r border-gray-800 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-[#58a6ff] tracking-wide">Solo Engine</h2>
          <p className="text-xs text-gray-500 mt-1">Algorithmic Composer</p>
        </div>

        <div className="p-6 space-y-5 flex-grow">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Root Note</label>
              <select value={rootName} onChange={(e) => setRootName(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors">
                {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Scale / Mode</label>
              <select value={scaleName} onChange={(e) => setScaleName(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-2 text-sm focus:border-[#58a6ff] outline-none transition-colors">
                {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-gray-800" />

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Tempo</label>
                <span className="text-xs text-[#58a6ff] font-mono">{tempo} BPM</span>
              </div>
              <input type="range" min="60" max="180" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} className="w-full accent-[#58a6ff]" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Complexity</label>
                <span className="text-xs text-[#58a6ff] font-mono">{complexity}</span>
              </div>
              <input type="range" min="1" max="5" value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} className="w-full accent-[#58a6ff]" />
            </div>
          </div>

          <hr className="border-gray-800" />

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Mood</label>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map(m => (
                <button key={m} onClick={() => setMood(m)}
                  className={`text-xs py-2 rounded-md border transition-all hover:scale-[1.02] active:scale-95 ${
                    mood === m 
                      ? 'bg-[#58a6ff]/15 border-[#58a6ff] text-[#58a6ff] shadow-[0_0_8px_rgba(88,166,255,0.15)]' 
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-800" />

          <div>
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Percussive Techniques</label>
             <div className="space-y-2">
               {PERCUSSIVES.map(p => (
                 <label key={p} className="flex items-center space-x-3 cursor-pointer group">
                   <input type="checkbox" checked={!!percussives[p]} onChange={() => togglePercussive(p)} className="w-4 h-4 accent-[#58a6ff] cursor-pointer" />
                   <span className={`text-sm font-medium ${percussives[p] ? 'text-gray-200' : 'text-gray-400 group-hover:text-gray-300'}`}>{p}</span>
                 </label>
               ))}
             </div>
          </div>
        </div>

        <div className="p-6 bg-[#0d1117] border-t border-gray-800">
          <button onClick={handleGenerate}
            className="w-full py-4 bg-[#58a6ff] hover:bg-[#4a8ce0] text-[#0d1117] font-bold rounded-lg shadow-[0_0_15px_rgba(88,166,255,0.3)] transition-all hover:-translate-y-[1px] active:translate-y-0 active:scale-95 uppercase tracking-wider"
          >
            Generate Solo
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-[70%] flex flex-col bg-[#0d1117] p-6 overflow-y-auto custom-scrollbar">
        {/* Top actions */}
        <div className="flex justify-between items-center mb-4">
           <div>
             <h2 className="text-xl font-bold text-gray-200">Generated Sequence</h2>
             <p className="text-gray-500 text-sm mt-0.5">{columns.length > 0 ? `${columns.length} columns` : 'Waiting for generation...'}</p>
           </div>

           <div className="flex space-x-2">
             <button onClick={handlePlayToggle} disabled={columns.length === 0}
               className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold active:scale-95 transition-all disabled:opacity-40 ${
                 isPlaying ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
               }`}
             >
               {isPlaying ? (
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="4" width="3" height="12" rx="1"/><rect x="12" y="4" width="3" height="12" rx="1"/></svg>
               ) : (
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
               )}
               <span>{isPlaying ? 'Stop' : 'Play'}</span>
             </button>

             <button onClick={handleSave} disabled={columns.length === 0}
               className="px-4 py-2 bg-gray-800 text-[#58a6ff] font-bold text-sm rounded-md hover:bg-gray-700 active:scale-95 disabled:opacity-40 transition-all border border-gray-700"
             >
               Save
             </button>

             <button onClick={() => onOpenInEditor && onOpenInEditor(columns)} disabled={columns.length === 0}
               className="flex items-center space-x-2 px-4 py-2 bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/50 rounded-md hover:bg-[#58a6ff]/30 active:scale-95 disabled:opacity-40 transition-all hover:shadow-[0_0_10px_rgba(88,166,255,0.2)]"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
               <span className="text-sm font-bold">Open in Editor</span>
             </button>
           </div>
        </div>

        {/* Fretboard visualizer */}
        <div className="mb-6">
          <Fretboard
            tuning={TUNINGS['Standard']}
            capo={0}
            onNoteClick={() => {}}
            scaleName={scaleName}
            rootName={rootName}
            activeNotes={activeNotes}
          />
        </div>

        {/* Tab output */}
        <div className="flex-grow">
           <TabViewer columns={columns} playingCol={playingCol} />
        </div>
      </div>
    </div>
  );
}
