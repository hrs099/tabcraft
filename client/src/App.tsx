import { useState } from 'react';
import './index.css';
import { mockProject } from './mocks/demoData';
import { usePlayback } from './hooks/usePlayback';
import { useTranscription } from './hooks/useTranscription';
import { VideoPlayer } from './components/VideoPlayer';
import { FretboardReplay } from './components/FretboardReplay';
import { TabWorkspace } from './components/TabWorkspace';

function CorrectionSidebar({ transcription }: { transcription: ReturnType<typeof useTranscription> }) {
  const note = transcription.notes.find(n => n.id === transcription.selectedNoteId);
  
  if (!note) {
    return (
      <div className="glass-panel screen-container" style={{ padding: '20px', flex: 1 }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Correction Editor</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click an uncertain note in the workspace to edit.</p>
      </div>
    );
  }

  const suggestions = transcription.getSuggestionsForNote(note.id);

  return (
    <div className="glass-panel screen-container" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: '1.2rem' }}>Edit Note</h2>
        <span className={`conf-badge ${note.confidence >= 0.95 ? 'high' : note.confidence >= 0.85 ? 'med' : 'low'}`}>
          {Math.round(note.confidence * 100)}% Conf
        </span>
      </div>

      <div className="glass-button" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '12px', width: '100%' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Detected:</span>
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>String {note.string}, Fret {note.fret}</span>
        {note.techniqueTags.length > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{note.techniqueTags.join(', ')}</span>}
      </div>

      <div>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Alternate Suggestions</h3>
        {suggestions.map((s) => (
          <button 
            key={s.id} 
            className="glass-button" 
            style={{ width: '100%', justifyContent: 'space-between', marginBottom: '8px' }}
            onClick={() => transcription.updateNote(note.id, { string: s.string, fret: s.fret, techniqueTags: s.techniqueTags })}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span>String {s.string}, Fret {s.fret}</span>
              {s.techniqueTags.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.techniqueTags.join(', ')}</span>}
            </div>
            <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 'bold' }}>Accept</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="glass-button" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => transcription.updateNote(note.id, { fret: Math.max(0, note.fret - 1) })}>- Fret</button>
          <button className="glass-button" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => transcription.updateNote(note.id, { fret: note.fret + 1 })}>+ Fret</button>
        </div>
        <button 
          className="primary-button" 
          style={{ width: '100%' }}
          onClick={() => transcription.markNoteReviewed(note.id)}
        >
          Mark as Reviewed
        </button>
      </div>
    </div>
  );
}

function PracticeSidebar() {
  return (
    <div className="glass-panel screen-container" style={{ padding: '20px', flex: 1 }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Practice Tools</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Focus mode active.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="glass-button" style={{ justifyContent: 'space-between' }}>
          Metronome <span>OFF</span>
        </button>
        <button className="glass-button" style={{ justifyContent: 'space-between' }}>
          Speed <span>1.0x</span>
        </button>
        <button className="primary-button" style={{ marginTop: '12px' }}>Start Speed Trainer</button>
      </div>
    </div>
  );
}

function ExportPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel" style={{ padding: '32px', width: '400px' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Export Transcription</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button className="glass-button">Export as PDF</button>
          <button className="glass-button">Export as Guitar Pro (.gp5)</button>
          <button className="glass-button">Export as MusicXML</button>
        </div>
        <button className="primary-button" style={{ width: '100%' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function App() {
  const [activeMode, setActiveMode] = useState<'workspace' | 'correction' | 'practice'>('workspace');
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  const transcription = useTranscription();
  const playback = usePlayback(transcription.bars, transcription.notes, transcription.percussions);

  const handleModeChange = (mode: typeof activeMode) => {
    setActiveMode(mode);
    if (mode !== 'correction') {
      transcription.setSelectedNoteId(null);
    }
  };

  return (
    <div className="workspace-layout">
      {/* Header */}
      <header className="workspace-header glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)', letterSpacing: '2px' }}>TABVISION</h1>
          <div style={{ padding: '0 16px', borderLeft: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{mockProject.title}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
          {(['workspace', 'correction', 'practice'] as const).map(mode => (
            <button 
              key={mode}
              onClick={() => handleModeChange(mode)}
              style={{
                background: activeMode === mode ? '#ffffff' : 'transparent',
                color: activeMode === mode ? '#000000' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'capitalize'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
        
        <div>
          <button className="primary-button" onClick={() => setIsExportOpen(true)}>Export</button>
        </div>
      </header>

      {/* Left Column */}
      <div className="workspace-left">
        <VideoPlayer playback={playback} />
        {activeMode === 'workspace' && (
          <div className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Song Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div className="glass-button" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span>Tuning</span>
                <span style={{ fontWeight: 'bold' }}>Standard EADGBE</span>
              </div>
              <div className="glass-button" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span>Capo</span>
                <span style={{ fontWeight: 'bold' }}>None</span>
              </div>
              <div className="glass-button" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span>Mode</span>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{mockProject.mode}</span>
              </div>
            </div>
          </div>
        )}
        {activeMode === 'correction' && <CorrectionSidebar transcription={transcription} />}
        {activeMode === 'practice' && <PracticeSidebar />}
      </div>
      
      {/* Right Column */}
      <div className="workspace-right">
        {/* Fretboard always visible across all modes */}
        <aside className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <FretboardReplay playback={playback} />
        </aside>

        {/* Tablature workspace fills remaining space */}
        <section className="glass-panel screen-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{activeMode} Workspace</h2>
              
              {/* Low Confidence Filter Toggle */}
              <button 
                className="glass-button" 
                style={{ padding: '4px 8px', fontSize: '0.8rem', background: transcription.filterLowConfidence ? 'rgba(255, 71, 87, 0.2)' : '' }}
                onClick={() => transcription.setFilterLowConfidence(!transcription.filterLowConfidence)}
              >
                {transcription.filterLowConfidence ? 'Clear Filter' : 'Filter Low Confidence'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--conf-high)' }}></div> High
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--conf-med)' }}></div> Medium
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--conf-low)' }}></div> Low
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00cec9' }}>✓</div> User Corrected
              </span>
            </div>
          </div>
          
          <TabWorkspace playback={playback} transcription={transcription} onModeChange={setActiveMode} />
        </section>
      </div>

      {isExportOpen && <ExportPopup onClose={() => setIsExportOpen(false)} />}
    </div>
  );
}

export default App;
