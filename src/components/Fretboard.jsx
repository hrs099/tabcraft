import React, { useMemo } from 'react';
import { midiToNoteName, isInScale, getRootMidiFromName, HARMONIC_NODES } from '../utils/music';

// Frets where natural harmonics physically work
const VALID_HARMONIC_FRETS = new Set([3, 4, 5, 7, 9, 12, 16, 19, 24]);

export default function Fretboard({
  tuning, capo, onNoteClick,
  scaleName = 'Major', rootName = 'C',
  activeNotes = [],
  harmonicsView = false,
  onHarmonicsViewToggle,
  harmonicArtic = false,  // true when <> articulation is active in the Editor
}) {
  const frets = Array.from({ length: 25 }, (_, i) => i);
  const strings = [0, 1, 2, 3, 4, 5]; 

  const rootMidiOffset = getRootMidiFromName(rootName);
  const activeSet = useMemo(() => new Set(activeNotes.map(n => `${n.stringIdx}-${n.fretIdx}`)), [activeNotes]);
  
  // Build a quick lookup for harmonic node data by fret
  const harmonicByFret = {};
  HARMONIC_NODES.forEach(h => { harmonicByFret[h.fret] = h; });


  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      {/* Header row with Harmonics toggle */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Fretboard</span>
        {onHarmonicsViewToggle && (
          <button
            onClick={onHarmonicsViewToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
              harmonicsView
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'border-gray-700 text-gray-400 hover:border-amber-500/50 hover:text-amber-400'
            }`}
            title="Toggle Harmonics View — highlights natural harmonic node positions"
          >
            <span className="text-base leading-none">◇</span>
            Harmonics View
          </button>
        )}
      </div>

      <div className="inline-flex flex-col min-w-max bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-2xl relative">
        
        {/* Harmonics legend */}
        {harmonicsView && (
          <div className="flex flex-wrap gap-3 mb-4 px-1">
            {HARMONIC_NODES.map(h => (
              <span key={h.fret} className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border" style={{ color: h.color, borderColor: h.color + '60', background: h.color + '15' }}>
                <span className="font-mono">&lt;{h.fret}&gt;</span>
                <span className="font-normal opacity-80">{h.label} — {h.desc}</span>
              </span>
            ))}
          </div>
        )}

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

          {/* Harmonic Node Column Highlight */}
          {harmonicsView && (
            <div className="absolute inset-0 pointer-events-none flex pr-4 ml-[48px] z-30">
              {frets.map(fretIdx => {
                const hNode = harmonicByFret[fretIdx];
                if (!hNode) return <div key={`hn-${fretIdx}`} className="w-[48px]" />;
                return (
                  <div
                    key={`hn-${fretIdx}`}
                    className="w-[48px] h-full rounded-sm"
                    style={{
                      background: `${hNode.color}18`,
                      boxShadow: `inset 0 0 0 1px ${hNode.color}40`,
                    }}
                  />
                );
              })}
            </div>
          )}

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
                  // strip octave for display brevity
                  const noteNameShort = noteName.replace(/\d+$/, '');
                  const isScaleNote = isInScale(actualMidi, rootMidiOffset, scaleName);
                  const isRootNote = actualMidi % 12 === rootMidiOffset;
                  const isCapoFret = fretIdx === capo && capo > 0;
                  const isUnplayable = fretIdx < capo;
                  const isActive = activeSet.has(`${stringIdx}-${fretIdx}`);
                  const hNode = harmonicByFret[fretIdx];
                  const isHarmonicNode = harmonicsView && !!hNode;
                  // When user has harmonic articulation active: show valid/invalid frets
                  const isValidHarmonicFret = VALID_HARMONIC_FRETS.has(fretIdx);
                  const isInvalidForHarmonic = harmonicArtic && !isValidHarmonicFret && fretIdx > 0;
                  const isHighlightedForHarmonic = harmonicArtic && isValidHarmonicFret;

                  return (
                    <div 
                      key={fretIdx} 
                      className={`relative w-[48px] h-full flex items-center justify-center cursor-pointer z-20 ${
                        isUnplayable ? 'opacity-20 pointer-events-none' 
                        : isInvalidForHarmonic ? 'opacity-25 cursor-not-allowed'
                        : isHighlightedForHarmonic ? 'bg-green-500/10 hover:bg-green-500/20'
                        : 'hover:bg-[#58a6ff]/10'
                      }`}
                      onClick={() => !isUnplayable && onNoteClick(stringIdx, fretIdx, actualMidi, noteName)}
                      title={isInvalidForHarmonic ? `Harmonics don't ring at fret ${fretIdx}. Valid: 5, 7, 12, 19...` : undefined}
                    >
                       {/* Fret wire */}
                       <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gray-500/30 pointer-events-none z-0" />

                       {/* Capo bar */}
                       {isCapoFret && (
                         <div className="absolute left-[-2px] -top-1 -bottom-1 w-[6px] bg-[#58a6ff] rounded-sm shadow-[0_0_12px_rgba(88,166,255,0.6)] pointer-events-none z-30" />
                       )}

                       {/* Valid harmonic ring when harmonic articulation active */}
                       {isHighlightedForHarmonic && !isActive && (
                         <div className="absolute inset-1 rounded-sm border border-green-400/50 pointer-events-none z-10 animate-pulse" />
                       )}

                       {/* Note bubble — Harmonics View mode */}
                       {isHarmonicNode && !isActive ? (
                         <div
                           className="flex items-center justify-center rounded-sm w-[32px] h-[26px] text-[10px] font-bold font-mono transition-all duration-150 z-40 ring-1"
                           style={{
                             color: hNode.color,
                             background: hNode.color + '22',
                             ringColor: hNode.color + '70',
                             boxShadow: `0 0 8px ${hNode.color}60`,
                             border: `1px solid ${hNode.color}80`,
                           }}
                         >
                           &lt;{noteNameShort}&gt;
                         </div>
                       ) : (
                         /* Normal Note bubble */
                         <div className={`flex items-center justify-center rounded-full w-[26px] h-[26px] text-[11px] font-mono shadow-sm
                            ${isActive 
                               ? 'bg-green-400 text-[#0d1117] font-extrabold z-40 scale-125 shadow-green-400/60 ring-2 ring-green-300'
                               : isRootNote 
                                 ? 'bg-yellow-400 text-[#0d1117] font-extrabold z-30 scale-110 shadow-yellow-400/50 hover:scale-125'
                                 : isScaleNote 
                                   ? 'bg-[#58a6ff] text-[#0d1117] font-extrabold z-20 hover:scale-110 shadow-[#58a6ff]/30' 
                                   : 'bg-gray-800 text-gray-500 opacity-20 hover:opacity-100 hover:bg-gray-700 text-[10px]'
                            }`}
                         >
                           {noteNameShort}
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
