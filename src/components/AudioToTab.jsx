import React, { useState, useRef } from 'react';
import TabViewer, { exportAsPdf } from './TabViewer';
import Fretboard from './Fretboard';
import { TUNINGS } from '../utils/music';
import { initAudio, playTab, stopTab, playNote } from '../utils/playback';

import { useV2Transcription } from '../hooks/useV2Transcription';
import { useKeyboardEditorShortcuts } from '../hooks/useKeyboardEditorShortcuts';
import { normalizeTranscriptionResponse, toLegacyColumns, extractConfidenceMap } from '../utils/transcriptionAdapters';
import AudioResearchDashboard from './dashboard/AudioResearchDashboard';

export default function AudioToTab({ onOpenInEditor }) {
  const [file, setFile] = useState(null);
  const [dashTab, setDashTab] = useState('tab');
  const [harmonicsView, setHarmonicsView] = useState(false);

  // V2 Orchestration State
  const [normalizedData, setNormalizedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [confidenceScores, setConfidenceScores] = useState({});
  // Detected tuning (auto-detected by backend)
  const [detectedTuningName, setDetectedTuningName] = useState('Standard');

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingCol, setPlayingCol] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const [metronomeOn, setMetronomeOn] = useState(false);

  const fileInputRef = useRef(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { transcribe, isProcessing, progress, backendOnline, error: transError } = useV2Transcription();

  const getActiveTuning = () => {
    return TUNINGS[detectedTuningName] || TUNINGS['Standard'];
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.type.startsWith('audio/') && !droppedFile.name.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/i)) {
        alert('Invalid file format. Please drop an audio file (.wav, .mp3, etc.)');
        return;
      }
      setFile(droppedFile);
    }
  };
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('audio/') && !selectedFile.name.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/i)) {
        alert('Invalid file format. Please select an audio file (.wav, .mp3, etc.)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    // Send Standard tuning as default — backend will auto-detect
    const backendTuningJson = JSON.stringify([...TUNINGS['Standard']].reverse());

    try {
      const rawRes = await transcribe({ 
        file, 
        backendTuningJson, 
        suggestGroove: false, 
        forceV2: true, 
        percussives: {} // Empty: backend auto-detects percussion
      });
      
      const normalized = normalizeTranscriptionResponse(rawRes);
      setNormalizedData(normalized);

      const legacyCols = toLegacyColumns(normalized, normalized.metadata.bpm || 100);
      setColumns(legacyCols);

      const scores = extractConfidenceMap(legacyCols);
      setConfidenceScores(scores);

      // Auto-sync tuning if detected
      if (normalized.metadata?.tuning) {
        const detectedMidi = normalized.metadata.tuning;
        const match = Object.entries(TUNINGS).find(([name, midi]) => 
          midi.length === detectedMidi.length && midi.every((v, i) => v === detectedMidi[i])
        );
        if (match) setDetectedTuningName(match[0]);
      }

      // AUTO-COLLAPSE SIDEBAR AFTER SUCCESS
      setSidebarCollapsed(true);

    } catch (err) {
      alert(`Transcription Failed: ${err.message}`);
    }
  };

  const handlePlayToggle = async () => {
    await initAudio();
    if (isPlaying) {
      stopTab(); setIsPlaying(false); setPlayingCol(null);
    } else {
      setIsPlaying(true);
      const startAt = selectedCol !== null ? selectedCol : 0;
      playTab(columns, normalizedData?.metadata?.bpm || 100, metronomeOn, detectedTuningName, (colIdx) => setPlayingCol(colIdx), () => {
        setIsPlaying(false); setPlayingCol(null);
      }, startAt, isLooping);
    }
  };

  const hasResult = columns.length > 0;
  useKeyboardEditorShortcuts({
    onArrowRight: () => setSelectedCol(prev => prev === null ? 0 : Math.min(prev + 1, columns.length - 1)),
    onArrowLeft: () => setSelectedCol(prev => prev === null ? 0 : Math.max(prev - 1, 0)),
    onPlayToggle: handlePlayToggle,
    onMetronomeToggle: () => setMetronomeOn(v => !v),
    onLoopToggle: () => setIsLooping(v => !v),
    onPdfExport: () => exportAsPdf(columns, `TabCraft V2`),
    onEscape: () => setSelectedCol(null),
    enabled: hasResult
  });
  const mt = normalizedData?.metadata || {};

  // Detected info chips
  const detectedPercussions = mt.percussion_detected || [];
  const detectedKey = mt.key?.name || null;
  const detectedBpm = mt.bpm || null;

  let activeNotesForFretboard = [];
  if (playingCol !== null && columns[playingCol] && columns[playingCol].notes) {
     activeNotesForFretboard = columns[playingCol].notes
        .filter(n => typeof n.stringIdx === 'number' && typeof n.fretIdx === 'number')
        .map(n => ({ stringIdx: n.stringIdx, fretIdx: n.fretIdx + (mt.capo || 0) }));
  }

  return (
    <div className="flex h-full w-full bg-[#0d1117] text-gray-200 overflow-hidden animate-fade-in relative">
      
      {/* Sidebar Toggle Button (Floating) */}
      {hasResult && (
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-4 bottom-4 z-[100] p-3 bg-[#161b22] border border-gray-700 rounded-full shadow-2xl hover:bg-gray-800 transition-all active:scale-95"
          title={sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
        >
          {sidebarCollapsed ? (
            <svg className="w-5 h-5 text-[#58a6ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          )}
        </button>
      )}

      {/* LEFT PANEL — Simplified */}
      <div className={`transition-all duration-500 ease-in-out bg-[#161b22] border-r border-gray-800 flex flex-col space-y-5 overflow-y-auto custom-scrollbar 
        ${sidebarCollapsed ? 'w-0 opacity-0 pointer-events-none p-0' : 'w-[32%] min-w-[340px] p-6'}`}>
        <div className="whitespace-nowrap">
          <h2 className="text-2xl font-bold text-[#58a6ff]">Audio → Tab</h2>
          <p className="text-sm text-gray-400 mt-1">AI-powered transcription — auto-detects tuning, percussion & techniques</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full inline-block ${backendOnline === null ? 'bg-gray-500' : backendOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-gray-500">{backendOnline === null ? 'Checking backend…' : backendOnline ? 'Backend online' : 'Backend offline'}</span>
          </div>
          {transError && <p className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded">{transError}</p>}
        </div>

        {/* File Ingestion */}
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#58a6ff] hover:bg-[#58a6ff]/5 transition-all min-h-[140px]" onDrop={handleFileDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
           <input type="file" className="hidden" ref={fileInputRef} accept="audio/*" onChange={handleFileSelect} />
           <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
           {file ? (
             <div><p className="text-[#58a6ff] font-bold truncate max-w-[250px]">{file.name}</p><p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
           ) : <p className="text-gray-400 font-medium">Drag & Drop audio file</p>}
        </div>

        {/* Detection Info Chips — shown after transcription */}
        {hasResult && (
          <div className="bg-[#0d1117] p-4 rounded-lg border border-gray-800 space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">🔍 Auto-Detected</label>
            <div className="flex flex-wrap gap-2">
              {detectedTuningName && (
                <span className="px-3 py-1.5 bg-[#58a6ff]/10 text-[#58a6ff] rounded-full text-xs font-bold border border-[#58a6ff]/30">
                  🎸 {detectedTuningName}
                </span>
              )}
              {detectedBpm && (
                <span className="px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold border border-purple-500/30">
                  ♩ {Math.round(detectedBpm)} BPM
                </span>
              )}
              {detectedKey && (
                <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                  🎵 {detectedKey}
                </span>
              )}
              {mt.capo > 0 && (
                <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/30">
                  Capo {mt.capo}
                </span>
              )}
            </div>
            {detectedPercussions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {detectedPercussions.map(p => (
                  <span key={p} className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-bold border border-yellow-500/30">
                    🥁 {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Core Submission */}
        <div className="flex-grow flex items-end">
           <button disabled={!file || isProcessing || backendOnline === false} onClick={handleTranscribe} className="w-full py-4 bg-[#58a6ff] text-[#0d1117] font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider relative overflow-hidden">
             {isProcessing ? (
               <div className="flex items-center justify-center space-x-3 w-full">
                 <svg className="animate-spin h-5 w-5 text-[#0d1117] z-10" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <span className="z-10">{progress}% Analyzing…</span>
                 <div className="absolute left-0 bottom-0 top-0 bg-white/30 z-0 transition-all duration-300" style={{ width: `${progress}%` }} />
               </div>
             ) : 'Transcribe'}
           </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
        {/* Actions Bar */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-800 flex-wrap gap-3 min-h-[60px]">
            {hasResult && (
              <div className="flex space-x-2 w-full justify-end items-center">
                <button onClick={() => setMetronomeOn(!metronomeOn)} className={`px-3 py-2 rounded text-xs font-bold transition-all ${metronomeOn ? 'bg-[#58a6ff]/20 text-[#58a6ff]' : 'bg-gray-800 text-gray-500'}`}>
                   {metronomeOn ? '🔔 On' : '🔔 Off'}
                </button>
                <button onClick={() => setIsLooping(!isLooping)} className={`px-3 py-2 rounded text-xs font-bold transition-all ${isLooping ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                   {isLooping ? '🔁 Loop' : '🔁 Once'}
                </button>
                <div className="w-px h-6 bg-gray-800 mx-2"></div>
                <button onClick={handlePlayToggle} className="px-3 py-2 bg-green-500/10 text-green-400 font-bold rounded text-sm tracking-wide">
                  {isPlaying ? '⏸ Stop' : '▶ Play'}
                </button>
                <button onClick={() => exportAsPdf(columns, `TabCraft V2`)} className="px-3 py-2 bg-red-500/10 text-red-400 font-bold rounded text-sm">PDF</button>
                <button onClick={() => onOpenInEditor && onOpenInEditor(columns)} className="px-3 py-2 bg-[#58a6ff]/20 text-[#58a6ff] hover:bg-[#58a6ff]/30 border border-[#58a6ff]/50 font-bold rounded text-sm">Open in Editor</button>
              </div>
            )}
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-gray-800 px-6">
          {[{ id: 'tab', label: '📄 Tablature' }, { id: 'analysis', label: '🔬 Intelligence Dashboard' }].map(t => (
            <button key={t.id} onClick={() => setDashTab(t.id)} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${dashTab === t.id ? 'border-[#58a6ff] text-[#58a6ff]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab View */}
        {dashTab === 'tab' && (
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-4">
            <div className="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-md pb-4 border-b border-gray-800/50">
              <Fretboard tuning={getActiveTuning()} capo={mt.capo || 0} onNoteClick={async (s, f, m) => { await initAudio(); playNote(m); }} activeNotes={activeNotesForFretboard} scaleName={mt.key?.name?.split(' ')[1] || 'Major'} rootName={mt.key?.name?.split(' ')[0] || 'C'} harmonicsView={harmonicsView} onHarmonicsViewToggle={() => setHarmonicsView(v => !v)} />
            </div>
            {hasResult ? (
              <TabViewer columns={columns} playingCol={playingCol} activeCol={selectedCol} onColSelect={(i) => setSelectedCol(i)} editable={true} confidenceScores={confidenceScores} tuning={getActiveTuning()} capo={mt.capo || 0} />
            ) : (
              <div className="flex-1 border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center min-h-[200px]">
                <p className="text-gray-500 italic">Upload an audio file and hit Transcribe…</p>
              </div>
            )}
          </div>
        )}

        {/* Analysis Dashboard View */}
        {dashTab === 'analysis' && (
          <AudioResearchDashboard data={normalizedData?.version === 'v2' ? normalizedData : null} />
        )}
      </div>
    </div>
  );
}
