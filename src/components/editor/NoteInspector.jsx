import React from 'react';
import { NOTE_NAMES } from '../../utils/music';
import { StatusBadge } from '../dashboard/AudioResearchDashboard';

export default function NoteInspector({ note, onSwapAlternative, onClose }) {
  if (!note) return null;

  const isPerc = note.isPerc;
  
  // Note formatting
  const noteNameFull = typeof note.pitch === 'number' 
    ? `${NOTE_NAMES[note.pitch % 12]}${Math.floor(note.pitch / 12) - 1}` 
    : '--';

  return (
    <div className="w-80 min-w-[320px] bg-[#161b22] border-l border-gray-800 flex flex-col shadow-2xl relative custom-scrollbar overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-sm font-bold text-[#58a6ff] uppercase tracking-wider flex items-center gap-2">
          <span>🔍</span> Note Inspector
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white px-2 py-1">✕</button>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* Core ID Box */}
        <div className="flex gap-4">
          <div className="bg-[#0d1117] rounded border border-gray-700 flex-1 p-3 text-center">
             <p className="text-[10px] text-gray-500 font-bold uppercase">{isPerc ? 'Technique' : 'Pitch'}</p>
             <p className="text-xl font-bold text-gray-200 mt-1">{isPerc ? note.techLabel : noteNameFull}</p>
          </div>
          <div className="bg-[#0d1117] rounded border border-gray-700 flex-1 p-3 text-center">
             <p className="text-[10px] text-gray-500 font-bold uppercase">{isPerc ? 'Type' : 'Pos'}</p>
             <p className="text-xl font-bold text-gray-200 mt-1">{isPerc ? 'Perc' : `${note.stringIdx}:${note.fretIdx}`}</p>
          </div>
        </div>

        {/* Confidence Block */}
        <div className="bg-[#0d1117] rounded-lg border border-gray-800 p-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-3">Confidence & Extraction</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Normalized V2</span>
              <span className={`font-bold ${note.normalized_confidence >= 0.8 ? 'text-green-400' : 'text-yellow-400'}`}>
                {note.normalized_confidence ? `${Math.round(note.normalized_confidence * 100)}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Raw Model</span>
              <span className="font-bold text-gray-500">
                {note.raw_confidence ? `${Math.round(note.raw_confidence * 100)}%` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-800">
               <span className="text-gray-400">Source</span>
               <StatusBadge status="heuristic" source={note.confidence_source} />
            </div>
          </div>
        </div>

        {/* Alternative Positions (Only for melodic notes from V2 Viterbi) */}
        {!isPerc && note.alternative_positions && note.alternative_positions.length > 0 && (
          <div>
             <div className="flex items-center gap-2 mb-3">
               <p className="text-[10px] text-gray-500 font-bold uppercase">Alternative Placements</p>
               <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">VITERBI</span>
             </div>
             
             <div className="space-y-2">
               {note.alternative_positions.map((alt, idx) => {
                 const isCurrent = alt.stringIdx === note.stringIdx && alt.fretIdx === note.fretIdx;
                 return (
                   <div key={idx} 
                     onClick={() => !isCurrent && onSwapAlternative(alt)}
                     className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                       isCurrent 
                         ? 'bg-green-500/10 border-green-500/30 cursor-default' 
                         : 'bg-[#0d1117] border-gray-700 cursor-pointer hover:border-[#58a6ff]/50 hover:bg-[#58a6ff]/5'
                     }`}
                   >
                     <div>
                       <span className={`font-bold font-mono ${isCurrent ? 'text-green-400' : 'text-gray-200'}`}>S:{alt.stringIdx} F:{alt.fretIdx}</span>
                       {isCurrent && <span className="ml-2 text-[9px] text-green-500/70 border border-green-500/30 rounded px-1">CURRENT</span>}
                     </div>
                     <div className="text-xs text-gray-500">
                       Cost: {(100 / (alt.score || 1)).toFixed(1)}
                     </div>
                   </div>
                 );
               })}
             </div>
             <p className="text-[10px] text-gray-600 mt-2 italic leading-relaxed">
               Alternatives are generated by the V2 Fretboard Mapper. Swapping forces the note into the chosen string and fret.
             </p>
          </div>
        )}

        {/* Technique / Articulation */}
        {note.tech && (
           <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded flex items-center justify-between">
             <span className="text-xs font-bold text-gray-400">Articulation</span>
             <span className="text-sm font-bold text-purple-300 font-mono">{note.techLabel}</span>
           </div>
        )}
      </div>
    </div>
  );
}
