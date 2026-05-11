import { useRef, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { PlaybackContextData } from '../hooks/usePlayback';
import type { useTranscription } from '../hooks/useTranscription';

interface TabWorkspaceProps {
  playback: PlaybackContextData;
  transcription: ReturnType<typeof useTranscription>;
  onModeChange: (mode: 'workspace' | 'correction' | 'practice') => void;
}

const PERCUSSION_SYMBOLS: Record<string, string> = {
  'slap': 'X',
  'wrist-thump': '*',
  'tap': 'T',
  'nail-attack': '^'
};

export function TabWorkspace({ playback, transcription, onModeChange }: TabWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingLoop, setIsDraggingLoop] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  
  // 1 second = 150px
  const PIXELS_PER_SECOND = 150;
  const totalWidth = playback.duration * PIXELS_PER_SECOND;

  // Auto-scroll to keep playhead in view
  useEffect(() => {
    if (containerRef.current && playback.isPlaying) {
      const playheadX = playback.currentTime * PIXELS_PER_SECOND;
      const container = containerRef.current;
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      
      // If playhead goes past 70% of the visible container, scroll
      if (playheadX > scrollLeft + clientWidth * 0.7) {
        container.scrollTo({ left: playheadX - clientWidth * 0.3, behavior: 'auto' });
      }
      
      // If playhead jumps back (e.g. loop), scroll back
      if (playheadX < scrollLeft) {
        container.scrollTo({ left: playheadX - clientWidth * 0.3, behavior: 'auto' });
      }
    }
  }, [playback.currentTime, playback.isPlaying]);

  const getTimeFromEvent = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(x / PIXELS_PER_SECOND, playback.duration));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey || e.altKey) {
      setIsDraggingLoop(true);
      const time = getTimeFromEvent(e);
      setDragStart(time);
      playback.controls.setLoop(time, time + 0.1); 
    } else {
      playback.controls.seek(getTimeFromEvent(e));
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDraggingLoop && dragStart !== null) {
      const time = getTimeFromEvent(e);
      const start = Math.min(dragStart, time);
      const end = Math.max(dragStart, time);
      playback.controls.setLoop(start, end);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingLoop(false);
  };

  const handleNoteClick = (e: MouseEvent, noteId: string, startTime: number) => {
    e.stopPropagation();
    playback.controls.seek(startTime);
    transcription.setSelectedNoteId(noteId);
    onModeChange('correction');
  };

  const isBarActive = (barStart: number, barEnd: number) => {
    return playback.currentTime >= barStart && playback.currentTime <= barEnd;
  };

  return (
    <div 
      ref={containerRef}
      style={{ flex: 1, padding: '24px', overflowX: 'auto', overflowY: 'hidden', background: 'var(--bg-surface)', position: 'relative' }}
    >
      <div 
        style={{ position: 'relative', width: `${totalWidth}px`, height: '100%', cursor: isDraggingLoop ? 'ew-resize' : 'pointer' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Playhead */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            bottom: 0, 
            left: `${playback.currentTime * PIXELS_PER_SECOND}px`, 
            width: '1px', 
            background: 'var(--primary)', 
            zIndex: 10,
            boxShadow: '0 0 8px rgba(255,255,255,0.4)',
            pointerEvents: 'none'
          }} 
        >
          <div style={{ position: 'absolute', top: '-10px', left: '-5px', width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px rgba(255,255,255,0.8)' }}></div>
        </div>

        {/* Loop Region */}
        {playback.loopStart !== null && playback.loopEnd !== null && (
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: `${playback.loopStart * PIXELS_PER_SECOND}px`,
            width: `${(playback.loopEnd - playback.loopStart) * PIXELS_PER_SECOND}px`,
            background: 'rgba(255, 255, 255, 0.05)',
            borderLeft: '1px dashed var(--primary)',
            borderRight: '1px dashed var(--primary)',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            <div style={{ position: 'absolute', top: '-20px', left: 0, fontSize: '10px', color: 'var(--primary)' }}>Loop Start</div>
            <div style={{ position: 'absolute', top: '-20px', right: 0, fontSize: '10px', color: 'var(--primary)' }}>Loop End</div>
          </div>
        )}

        {/* Bars */}
        <div style={{ height: '20px', position: 'relative', borderBottom: '1px solid var(--border-subtle)' }}>
          {transcription.bars.map(bar => {
            const isFilteredOut = transcription.filterLowConfidence && bar.confidence >= 0.85;
            
            return (
              <div 
                key={bar.id} 
                style={{ 
                  position: 'absolute', 
                  left: `${bar.startTime * PIXELS_PER_SECOND}px`, 
                  width: `${(bar.endTime - bar.startTime) * PIXELS_PER_SECOND}px`,
                  height: '100%',
                  borderLeft: '1px solid var(--border-subtle)',
                  paddingLeft: '4px',
                  fontSize: '10px',
                  color: isBarActive(bar.startTime, bar.endTime) ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: isBarActive(bar.startTime, bar.endTime) ? 'bold' : 'normal',
                  background: isFilteredOut ? 'rgba(0,0,0,0.5)' : (isBarActive(bar.startTime, bar.endTime) ? 'rgba(255,255,255,0.05)' : 'transparent'),
                  opacity: isFilteredOut ? 0.2 : 1,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s'
                }}
              >
                Bar {bar.index}
              </div>
            );
          })}
        </div>

        {/* Percussion Lane (Symbolic) */}
        <div style={{ height: '30px', position: 'relative', marginTop: '10px' }}>
          {transcription.percussions.map(p => {
            const isFilteredOut = transcription.filterLowConfidence && p.confidence >= 0.85;
            const symbol = PERCUSSION_SYMBOLS[p.type] || p.type;
            const isActive = playback.currentTime >= p.startTime && playback.currentTime <= p.endTime;
            const isLowConf = p.confidence < 0.85;

            return (
              <div 
                key={p.id}
                onClick={(e) => { e.stopPropagation(); playback.controls.seek(p.startTime); }}
                style={{
                  position: 'absolute',
                  left: `${p.startTime * PIXELS_PER_SECOND}px`,
                  top: '5px',
                  background: isActive ? '#ffffff' : 'var(--bg-surface-elevated)',
                  border: `1px solid ${isActive ? '#fff' : 'var(--border-active)'}`,
                  color: isActive ? '#000' : 'var(--text-muted)',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transform: 'translateX(-50%)',
                  zIndex: isActive ? 6 : 5,
                  opacity: isFilteredOut ? 0.2 : 1,
                  transition: 'opacity 0.2s'
                }}
                title={`${p.type} (${Math.round(p.confidence * 100)}%)`}
              >
                {symbol}
                {isLowConf && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '10px', background: 'transparent' }}>
                    ⚠️
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tablature Strings */}
        <div style={{ position: 'relative', height: '100px', marginTop: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(str => (
            <div 
              key={str} 
              style={{ 
                position: 'absolute', 
                top: `${(str - 1) * 16}px`, 
                left: 0, 
                right: 0, 
                height: '1px', 
                background: 'var(--border-active)',
                zIndex: 2,
                pointerEvents: 'none'
              }} 
            />
          ))}

          {/* Notes */}
          {transcription.notes.map(note => {
            const isFilteredOut = transcription.filterLowConfidence && note.confidence >= 0.85;
            const isActive = playback.currentNotes.some(n => n.id === note.id);
            const isSelected = transcription.selectedNoteId === note.id;
            
            let color = 'var(--text-muted)';
            if (note.confidence >= 0.95) color = 'var(--conf-high)';
            else if (note.confidence >= 0.85) color = 'var(--conf-med)';
            else color = 'var(--conf-low)';

            if (note.isUserCorrected) {
              color = '#00cec9'; // Cyan color for user corrected notes
            }

            return (
              <div
                key={note.id}
                onClick={(e) => handleNoteClick(e, note.id, note.startTime)}
                style={{
                  position: 'absolute',
                  left: `${note.startTime * PIXELS_PER_SECOND}px`,
                  top: `${(note.string - 1) * 16}px`,
                  transform: 'translate(-50%, -50%)',
                  background: isActive || isSelected ? color : 'var(--bg-base)',
                  color: isActive || isSelected ? '#000' : color,
                  fontWeight: 'bold',
                  fontSize: '11px',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isActive || isSelected ? 'none' : `1px solid ${color}`,
                  borderRadius: note.isUserCorrected ? '50%' : '2px', // Make corrected notes circular
                  zIndex: isActive || isSelected ? 8 : 5,
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${color}` : 'none',
                  opacity: isFilteredOut ? 0.1 : 1,
                  transition: 'opacity 0.2s, box-shadow 0.2s'
                }}
                title={`Conf: ${Math.round(note.confidence * 100)}%`}
              >
                {note.fret}
                {note.isUserCorrected && (
                  <div style={{ position: 'absolute', top: '-8px', right: '-8px', color: '#00cec9', fontSize: '10px' }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Helper Text */}
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'var(--text-disabled)', fontSize: '0.8rem', pointerEvents: 'none' }}>
          Shift+Drag to create custom Loop Region
        </div>
      </div>
    </div>
  );
}
