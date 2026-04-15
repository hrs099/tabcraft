import React from 'react';
import { midiToNoteName, isInScale, getRootMidiFromName } from '../utils/music';

export default function Fretboard({ tuning, capo, onNoteClick, scaleName = 'Major', rootName = 'C', activeNotes = [] }) {
  const frets = Array.from({ length: 25 }, (_, i) => i);
  const strings = [0, 1, 2, 3, 4, 5]; 

  const rootMidiOffset = getRootMidiFromName(rootName);

  // Build a Set for O(1) lookup of currently-playing positions
  const activeSet = new Set(activeNotes.map(n => `${n.stringIdx}-${n.fretIdx}`));

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      <div className="inline-flex flex-col min-w-max bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-2xl relative">
        
        {/* Fret Numbers Header */}
        <div className="flex mb-3 pr-4 ml-[48px]">
           {frets.map(fret => (
              <div key={fret} className="w-[48px] flex justify-center text-xs text-gray-500 font-bold tracking-widest">
                 {fret}
              </div>
           ))}
        </div>

        {/* Fretboard Grid */}
        <div className="relative border-l-[6px] border-l-gray-300 bg-[#0d1117] py-2 rounded-md shadow-inner">
          
          {/* Fret Marker Inlays */}
          <div className="absolute inset-0 pointer-events-none flex pr-4 ml-[48px] z-0">
             {frets.map(fretIdx => {
                const singleDot = [3, 5, 7, 9, 15, 17, 19, 21].includes(fretIdx);
                const doubleDot = [12, 24].includes(fretIdx);
                return (
                   <div key={`dot-${fretIdx}`} className="w-[48px] h-full flex flex-col items-center justify-center space-y-16 opacity-30">
                      {singleDot && <div className="w-3.5 h-3.5 rounded-full bg-gray-200 shadow-inner" />}
                      {doubleDot && (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 mt-[-10px] shadow-inner" />
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 translate-y-8 shadow-inner" />
                        </>
                      )}
                   </div>
                );
             })}
          </div>

          {/* Strings */}
          {strings.map((stringIdx) => {
            const openMidi = tuning[stringIdx];
            const displayOpenName = midiToNoteName(openMidi);
            
            return (
              <div key={stringIdx} className="flex items-center relative h-[36px]">
                {/* Horizontal String Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-400 pointer-events-none z-10" style={{ height: `${1 + (stringIdx * 0.4)}px`, opacity: 0.5 + (stringIdx * 0.1) }} />
                
                {/* String Label */}
                <div className="w-[48px] flex items-center justify-center font-mono text-xs text-[#58a6ff] font-bold z-20 bg-[#0d1117] h-full border-r border-gray-800 shadow-md">
                  {displayOpenName}
                </div>

                {/* Fret cells */}
                {frets.map((fretIdx) => {
                  const actualMidi = openMidi + fretIdx;
                  const noteName = midiToNoteName(actualMidi);
                  const isScaleNote = isInScale(actualMidi, rootMidiOffset, scaleName);
                  const isRootNote = actualMidi % 12 === rootMidiOffset;
                  const isCapoFret = fretIdx === capo && capo > 0;
                  const isUnplayable = fretIdx < capo;
                  const isActive = activeSet.has(`${stringIdx}-${fretIdx}`);

                  return (
                    <div 
                      key={fretIdx} 
                      className={`relative w-[48px] h-full flex items-center justify-center cursor-pointer transition-all duration-150 z-20 ${
                        isUnplayable ? 'opacity-20 pointer-events-none' : 'hover:bg-[#58a6ff]/10'
                      }`}
                      onClick={() => !isUnplayable && onNoteClick(stringIdx, fretIdx, actualMidi, noteName)}
                    >
                       {/* Fret wire */}
                       <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gray-500/30 pointer-events-none z-0" />

                       {/* Capo bar */}
                       {isCapoFret && (
                         <div className="absolute left-[-2px] -top-1 -bottom-1 w-[6px] bg-[#58a6ff] rounded-sm shadow-[0_0_12px_rgba(88,166,255,0.6)] pointer-events-none z-30" />
                       )}

                       {/* Note bubble */}
                       <div className={`flex items-center justify-center rounded-full w-[26px] h-[26px] text-[11px] font-mono transition-all duration-150 shadow-sm
                          ${isActive 
                             ? 'bg-green-400 text-[#0d1117] font-extrabold z-40 scale-125 shadow-green-400/60 ring-2 ring-green-300'
                             : isRootNote 
                               ? 'bg-yellow-400 text-[#0d1117] font-extrabold z-30 scale-110 shadow-yellow-400/50 hover:scale-125'
                               : isScaleNote 
                                 ? 'bg-[#58a6ff] text-[#0d1117] font-extrabold z-20 hover:scale-110 shadow-[#58a6ff]/30' 
                                 : 'bg-gray-800 text-gray-500 opacity-20 hover:opacity-100 hover:bg-gray-700 text-[10px]'
                          }`}
                       >
                         {noteName}
                       </div>
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
