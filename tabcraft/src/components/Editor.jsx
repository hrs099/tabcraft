import React, { useState, useEffect } from 'react';
import Fretboard from './Fretboard';
import TabViewer from './TabViewer';
import { TUNINGS, SCALES, NOTE_NAMES } from '../utils/music';
import { initAudio, playTab, stopTab, playNote } from '../utils/playback';

export default function Editor({ initialColumns }) {
  const [tuningKey, setTuningKey] = useState('Standard');
  const [capo, setCapo] = useState(0);
  const [columns, setColumns] = useState([]);
  
  const [scaleName, setScaleName] = useState('Major');
  const [rootName, setRootName] = useState('C');
  const [bpm, setBpm] = useState(100);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [activeCol, setActiveCol] = useState(null);
  const [playingCol, setPlayingCol] = useState(null);

  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
      setActiveCol(null);
    }
  }, [initialColumns]);

  const handlePlayToggle = async () => {
    await initAudio();
    if (isPlaying) {
      stopTab();
      setIsPlaying(false);
      setPlayingCol(null);
    } else {
      setIsPlaying(true);
      playTab(columns, bpm, metronomeOn, tuningKey, (colIdx) => {
        setPlayingCol(colIdx);
      }, () => {
        setIsPlaying(false);
        setPlayingCol(null);
      });
    }
  };

  const tuning = TUNINGS[tuningKey];

  const handleNoteClick = async (stringIdx, fretIdx, midiNote, noteName) => {
    await initAudio();
    playNote(midiNote);

    setColumns((prev) => {
      const clone = prev.map(c => ({ ...c, notes: c.notes ? [...c.notes] : [] }));
      
      if (activeCol !== null && clone[activeCol]) {
         const col = clone[activeCol];
         if (col.type === 'melody' || col.type === 'chord' || col.type === 'spacer') {
             if (col.type === 'spacer') col.type = 'melody';
             const existingIdx = col.notes.findIndex(n => n.stringIdx === stringIdx && !n.isPerc);
             if (existingIdx > -1) {
                 if (col.notes[existingIdx].fretIdx === fretIdx) {
                    col.notes.splice(existingIdx, 1);
                 } else {
                    col.notes[existingIdx].fretIdx = fretIdx;
                 }
             } else {
                 col.notes.push({ stringIdx, fretIdx, tech: '', techLabel: '' });
             }
             return clone;
         }
      }
      
      const newCol = { id: Date.now(), type: 'melody', notes: [{ stringIdx, fretIdx, tech: '', techLabel: '' }]};
      clone.push(newCol);
      setTimeout(() => setActiveCol(clone.length - 1), 0);
      return clone;
    });
  };

  const clearTab = () => { setColumns([]); setActiveCol(null); };

  const handleSave = () => {
     const payload = {
       tuningKey, capo, scaleName, rootName, bpm, columns
     };
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
         } catch(e) { alert('Could not parse saved data.'); }
     } else {
         alert('No saved tabs found on this device.');
     }
  };

  // Derive active notes for fretboard highlighting during playback
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
    <div className="flex flex-col h-full bg-[#0d1117] p-6 overflow-y-auto animate-fade-in custom-scrollbar">
      {/* TOOLBAR TOP */}
      <div className="flex items-center justify-between xl:justify-start gap-4 mb-6 pb-4 border-b border-gray-800 flex-wrap">
        <h2 className="text-3xl font-bold text-[#58a6ff] mr-8">Editor</h2>
        
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Capo</label>
          <select value={capo} onChange={(e) => setCapo(Number(e.target.value))} className="bg-[#161b22] border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none hover:border-gray-500 transition-colors">
            {Array.from({ length: 13 }, (_, i) => (<option key={i} value={i}>{i === 0 ? 'Off' : `Fret ${i}`}</option>))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Tuning</label>
          <select value={tuningKey} onChange={(e) => setTuningKey(e.target.value)} className="bg-[#161b22] border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none hover:border-gray-500 transition-colors">
            {Object.keys(TUNINGS).map(key => (<option key={key} value={key}>{key}</option>))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-800 mx-2 hidden xl:block" />

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Root</label>
          <select value={rootName} onChange={(e) => setRootName(e.target.value)} className="bg-[#161b22] border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none hover:border-gray-500 transition-colors">
            {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-500 font-bold uppercase">Scale</label>
          <select value={scaleName} onChange={(e) => setScaleName(e.target.value)} className="bg-[#161b22] border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none hover:border-gray-500 transition-colors">
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center">
        <Fretboard 
          tuning={tuning} 
          capo={capo} 
          onNoteClick={handleNoteClick} 
          scaleName={scaleName}
          rootName={rootName}
          activeNotes={activeNotes}
        />

        <div className="mt-8 w-full flex-grow flex flex-col">
          {/* TAB TOOLBAR */}
          <div className="flex items-center justify-between mb-4 bg-[#151a22] p-4 rounded-lg border border-gray-800">
             <div className="flex items-center space-x-4">
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

                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input type="checkbox" checked={metronomeOn} onChange={e => setMetronomeOn(e.target.checked)} className="w-4 h-4 accent-[#58a6ff] cursor-pointer" />
                     <span className="text-sm text-gray-400 font-medium">Metronome</span>
                   </label>
                </div>
             </div>
             
             <div className="flex space-x-2">
               <button onClick={handleLoad} className="text-xs font-bold text-gray-400 hover:text-white px-3 py-2 rounded-md bg-gray-800/50 hover:bg-gray-700 active:scale-95 transition-all border border-gray-700">Load</button>
               <button onClick={handleSave} disabled={columns.length === 0} className="text-xs font-bold text-[#58a6ff] px-3 py-2 rounded-md bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 active:scale-95 transition-all disabled:opacity-40 border border-[#58a6ff]/30">Save</button>
               <button onClick={clearTab} className="text-xs font-bold text-gray-400 hover:text-red-400 px-3 py-2 rounded-md bg-gray-800/50 hover:bg-gray-800 active:scale-95 border border-transparent hover:border-red-500/50 transition-all">Clear</button>
             </div>
          </div>
          
          {columns.length === 0 ? (
             <div className="flex-grow border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center bg-[#0d1117]/50 mt-4 min-h-[180px]">
                <p className="text-gray-500 font-medium italic text-lg tracking-wide">Click frets to build chords, or load a saved tab...</p>
             </div>
          ) : (
             <TabViewer columns={columns} setColumns={setColumns} editable={true} activeCol={activeCol} onColSelect={setActiveCol} playingCol={playingCol} />
          )}
        </div>
      </div>
    </div>
  );
}
