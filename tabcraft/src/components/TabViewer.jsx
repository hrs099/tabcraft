import React from 'react';

export default function TabViewer({ columns = [], setColumns, editable = false, onColSelect, activeCol, playingCol }) {
  const strings = [0, 1, 2, 3, 4, 5]; 
  const tuningLabels = ['e', 'B', 'G', 'D', 'A', 'E'];

  const handleDelete = (index) => {
    setColumns(prev => prev.filter((_, i) => i !== index));
    if (onColSelect) onColSelect(null);
  };

  const handleAddBefore = (index) => {
    setColumns(prev => {
       const clone = [...prev];
       clone.splice(index, 0, { id: Date.now(), type: 'spacer', notes: [] });
       return clone;
    });
    if (onColSelect) onColSelect(null);
  };

  const handleAddAfter = (index) => {
    setColumns(prev => {
       const clone = [...prev];
       clone.splice(index + 1, 0, { id: Date.now(), type: 'spacer', notes: [] });
       return clone;
    });
    if (onColSelect) onColSelect(null);
  };

  const handleSetLabel = (index) => {
    const text = prompt("Enter section label (e.g. Verse, Chorus):");
    if (!text) return;
    setColumns(prev => {
       const clone = [...prev];
       clone.splice(index, 0, { id: Date.now(), type: 'label', text });
       return clone;
    });
    if (onColSelect) onColSelect(null);
  };

  const handleSetRepeat = (index, type) => {
    setColumns(prev => {
       const clone = [...prev];
       clone.splice(index, 0, { id: Date.now(), type });
       return clone;
    });
    if (onColSelect) onColSelect(null);
  };

  return (
    <div className="w-full bg-[#11151c] p-6 rounded-xl border border-gray-800 shadow-2xl overflow-x-auto custom-scrollbar relative">
      <div className="min-w-max flex items-end">
         
         {/* Left axis labels */}
         <div className="flex flex-col font-mono text-gray-500 text-[15px] leading-loose pr-2 select-none border-r border-gray-800 mr-2 pt-[28px]">
             <div className="text-yellow-500/80 font-bold">Perc|</div>
             {strings.map(s => <div key={'axis-'+s}>{tuningLabels[s]}|</div>)}
         </div>

         {/* Columns */}
         <div className="flex font-mono text-[#58a6ff] text-[15px] font-bold leading-loose tracking-widest pb-[2px]">
            {columns.length === 0 && !editable && (
              <div className="text-gray-500 italic px-4">No sequence available.</div>
            )}
            
            {columns.map((col, index) => {
               let maxWidth = 3;
               const cellRep = {};
               let percRep = '';
               
               if (col.type === 'melody' || col.type === 'chord' || col.type === 'percussion' || col.type === 'spacer') {
                   strings.forEach(sIdx => {
                      const note = col.notes?.find(n => n.stringIdx === sIdx && !n.isPerc);
                      if (note) {
                        let chunk = `${note.fretIdx}`;
                        if (note.tech === '< >') chunk = `<${chunk}>`;
                        else if (note.tech === '( )') chunk = `(${chunk})`;
                        if (note.techLabel && note.techLabel !== 'Tap') chunk = `${chunk}${note.techLabel}`;
                        
                        cellRep[sIdx] = chunk;
                        if (chunk.length + 1 > maxWidth) maxWidth = chunk.length + 1;
                      }
                   });
                   
                   const percs = col.notes?.filter(n => n.isPerc || n.stringIdx === 'perc');
                   if (percs && percs.length > 0) {
                      percRep = percs.map(p => p.techLabel || 'x').join('');
                      if (percRep.length + 1 > maxWidth) maxWidth = percRep.length + 1;
                   }
               }

               const isSelected = editable && activeCol === index;
               const isPlayingNow = playingCol === index;

               return (
                  <div 
                    key={col.id || index}
                    className={`relative flex flex-col items-center group transition-all duration-150 rounded-sm
                      ${editable ? 'cursor-pointer hover:bg-[#58a6ff]/10' : ''}
                      ${isSelected ? 'bg-[#58a6ff]/20 outline outline-1 outline-[#58a6ff]' : ''}
                      ${isPlayingNow ? 'bg-green-500/20 outline outline-2 outline-green-400 shadow-[0_0_12px_rgba(74,222,128,0.3)]' : ''}
                    `}
                    onClick={() => editable && onColSelect && onColSelect(isSelected ? null : index)}
                  >
                     
                     {/* Section Label area */}
                     <div className="h-7 w-full flex items-end justify-center mb-0 overflow-visible whitespace-nowrap text-[12px] text-yellow-400 font-bold select-none px-2 tracking-normal">
                         {col.type === 'label' ? col.text : ''}
                     </div>

                     {/* Percussion Row */}
                     <div className="whitespace-pre text-yellow-500/80">
                         {(() => {
                           if (col.type === 'repeat_start') return '|:-';
                           if (col.type === 'repeat_end') return '-:|';
                           if (col.type === 'label') return '---';
                           if (percRep !== '') { let p = `-${percRep}`; while (p.length < maxWidth+1) p += '-'; return p; }
                           return '-'.repeat(maxWidth+1);
                         })()}
                     </div>

                     {/* Guitar strings */}
                     {strings.map(sIdx => {
                         let chunk = cellRep[sIdx] || '';
                         let padded = '';
                         
                         if (col.type === 'repeat_start') padded = '|:-';
                         else if (col.type === 'repeat_end') padded = '-:|';
                         else if (col.type === 'label') padded = '---';
                         else {
                             if (chunk !== '') { padded = `-${chunk}`; while (padded.length < maxWidth+1) padded += '-'; } 
                             else { padded = '-'.repeat(maxWidth+1); }
                         }
                         return <div key={`${index}-${sIdx}`} className="whitespace-pre">{padded}</div>
                     })}

                     {/* Floating Action Toolbar */}
                     {editable && isSelected && (
                        <div className="absolute top-[110%] left-1/2 -translate-x-1/2 mt-2 z-50 bg-[#161b22] border border-[#58a6ff]/50 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex space-x-1 p-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                           <button onClick={() => handleAddBefore(index)} className="p-2 hover:bg-[#58a6ff]/20 text-[#58a6ff] rounded transition-colors" title="Insert Before">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                           </button>
                           <button onClick={() => handleAddAfter(index)} className="p-2 hover:bg-[#58a6ff]/20 text-[#58a6ff] rounded transition-colors" title="Insert After">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </button>
                           <div className="w-px h-6 bg-gray-700 self-center mx-0.5"></div>
                           <button onClick={() => handleSetLabel(index)} className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded transition-colors" title="Section Label">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                           </button>
                           <div className="w-px h-6 bg-gray-700 self-center mx-0.5"></div>
                           <button onClick={() => handleSetRepeat(index, 'repeat_start')} className="px-2 py-1 text-xs hover:bg-[#58a6ff]/20 text-[#58a6ff] rounded font-bold transition-colors">|:</button>
                           <button onClick={() => handleSetRepeat(index, 'repeat_end')} className="px-2 py-1 text-xs hover:bg-[#58a6ff]/20 text-[#58a6ff] rounded font-bold transition-colors">:|</button>
                           <div className="w-px h-6 bg-gray-700 self-center mx-0.5"></div>
                           <button onClick={() => handleDelete(index)} className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Delete">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
         
         {/* Right axis */}
         <div className="flex flex-col font-mono text-gray-500 text-[15px] leading-loose pl-1 select-none pt-[28px]">
             <div>|</div>
             {strings.map(s => <div key={'axisend-'+s}>|</div>)}
         </div>
      </div>
    </div>
  );
}
