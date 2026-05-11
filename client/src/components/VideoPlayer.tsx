import type { PlaybackContextData } from '../hooks/usePlayback';
import { mockVideo } from '../mocks/demoData';

interface VideoPlayerProps {
  playback: PlaybackContextData;
}

export function VideoPlayer({ playback }: VideoPlayerProps) {
  const { isPlaying, currentTime, duration, controls } = playback;

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <section className="workspace-video glass-panel screen-container">
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Source Video</h2>
        <span style={{ color: 'var(--text-muted)' }}>{mockVideo.fileName}</span>
      </div>
      
      {/* Square Video Container */}
      <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src={mockVideo.thumbnail} 
          alt="Video Thumbnail" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isPlaying ? 1 : 0.6, filter: 'grayscale(100%)', transition: 'all 0.4s ease' }} 
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {!isPlaying && (
            <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', borderRadius: '50%', padding: '20px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px', background: 'var(--bg-surface-elevated)', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            className="primary-button" 
            onClick={controls.togglePlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Scrubber */}
        <div 
          style={{ height: '8px', background: 'var(--border-active)', borderRadius: '4px', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            controls.seek(percent * duration);
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, bottom: 0, left: 0, 
              width: `${(currentTime / duration) * 100}%`, 
              background: 'var(--primary)', 
              transition: isPlaying ? 'none' : 'width 0.1s'
            }} 
          />
        </div>
        
        <button 
          className="glass-button" 
          style={{ justifyContent: 'center', marginTop: 'auto' }}
          onClick={() => {
            if (playback.loopStart !== null) {
              controls.clearLoop();
            } else {
              controls.setLoop(currentTime, Math.min(currentTime + 2, duration));
            }
          }}
        >
          {playback.loopStart !== null ? 'Clear Loop' : 'Set Loop Region'}
        </button>
      </div>
    </section>
  );
}
