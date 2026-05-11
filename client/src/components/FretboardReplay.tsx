import type { PlaybackContextData } from '../hooks/usePlayback';

interface FretboardReplayProps {
  playback: PlaybackContextData;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STRING_BASE_NOTES = [0, 4, 11, 7, 2, 9, 4]; // Dummy 0 index to align with 1-6 strings.

function getNoteName(stringNum: number, fret: number) {
  const base = STRING_BASE_NOTES[stringNum];
  return NOTE_NAMES[(base + fret) % 12];
}

export function FretboardReplay({ playback }: FretboardReplayProps) {
  const numFrets = 22;
  const strings = [1, 2, 3, 4, 5, 6]; // 1 is high E

  return (
    <div style={{ width: '100%', background: '#050505', borderRadius: 'var(--radius-sm)', padding: '16px 8px 32px 24px', boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', width: '100%', height: '140px' }}>
        
        {/* Frets & Fret Numbers */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <div 
            key={`fret-${i}`} 
            style={{
              position: 'absolute',
              left: `${(i / numFrets) * 100}%`,
              top: 0,
              bottom: 0,
              width: i === 0 ? '6px' : '2px',
              background: i === 0 ? '#fff' : 'var(--border-active)',
              transform: 'translateX(-50%)',
              zIndex: 1
            }}
          >
            {/* Fret Numbers at the bottom */}
            {i > 0 && [3, 5, 7, 9, 12, 15, 17, 19, 21].includes(i) && (
              <div style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                {i}
              </div>
            )}
          </div>
        ))}
        
        {/* Strings with Open Notes */}
        {strings.map((str, i) => (
          <div key={`string-group-${str}`}>
            {/* Open Note Label */}
            <div style={{ 
              position: 'absolute', 
              left: '-20px', 
              top: `${(i / 5) * 100}%`, 
              transform: 'translateY(-50%)', 
              fontSize: '10px', 
              color: 'var(--text-muted)',
              fontWeight: 600 
            }}>
              {getNoteName(str, 0)}
            </div>

            {/* String Line */}
            <div 
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(i / 5) * 100}%`,
                height: `${1 + (i * 0.3)}px`,
                background: '#666',
                transform: 'translateY(-50%)',
                zIndex: 2,
                boxShadow: '0 1px 2px rgba(0,0,0,0.8)'
              }}
            />
          </div>
        ))}
        
        {/* Active Notes */}
        {playback.currentNotes.map(note => {
          let xPos = 0;
          if (note.fret > 0) {
            // Position halfway between previous fret and this fret
            xPos = ((note.fret - 0.5) / numFrets) * 100;
          }
          
          const yPos = ((note.string - 1) / 5) * 100;
          const noteName = getNoteName(note.string, note.fret);
          
          return (
            <div 
              key={`active-note-${note.id}`}
              style={{
                position: 'absolute',
                left: `${xPos}%`,
                top: `${yPos}%`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #000',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 'bold',
                color: '#000'
              }}
            >
              {noteName}
            </div>
          );
        })}
      </div>
    </div>
  );
}
