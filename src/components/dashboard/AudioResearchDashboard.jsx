import React from 'react';

export function StatusBadge({ status, source }) {
  if (!status || status === 'implemented') return null;

  let colorClass = 'bg-gray-800 text-gray-400 border-gray-700'; // fallback
  let label = status.toUpperCase();

  if (status === 'scaffolded') {
    colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  } else if (status === 'heuristic') {
    colorClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  } else if (source === 'heuristic') {
    label = 'HEURISTIC';
    colorClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  }

  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${colorClass} tracking-wider`}>
      {label}
    </span>
  );
}

export function CoreMetadataPanel({ metadata }) {
  const fields = [
    { label: 'Key', value: metadata?.key?.name || '--', color: 'text-[#58a6ff]', badge: metadata?.key?.analysis_status },
    { label: 'BPM', value: metadata?.bpm || '--', color: 'text-green-400' },
    { label: 'Global Confidence', value: metadata?.confidence?.average ? `${Math.round(metadata.confidence.average * 100)}%` : '--', color: 'text-yellow-400' },
    { label: 'Capo', value: metadata?.capo > 0 ? `Fret ${metadata.capo}` : 'Off', color: 'text-pink-400' },
  ];

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><span>🎵</span> Core Metadata</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map(({ label, value, color, badge }) => (
          <div key={label} className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800 relative">
             {badge && <div className="absolute -top-2 right-2"><StatusBadge status={badge} /></div>}
             <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
             <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TuningAnalysisPanel({ analysis }) {
  const tuningData = analysis?.tuning;
  if (!tuningData) return null;

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><span>🎸</span> Tuning Analysis</h3>
        <StatusBadge status={tuningData.analysis_status} />
      </div>
      
      <div className="bg-[#0d1117] rounded-lg p-4 border border-gray-800 mb-3 text-center">
         <p className="text-xs text-gray-500">Selected Hypothesis</p>
         <p className="text-2xl font-bold text-purple-400 mt-1">{tuningData.selected || '--'}</p>
         {tuningData.reason && <p className="text-xs text-gray-600 mt-2 italic">{tuningData.reason}</p>}
      </div>

      {tuningData.candidates && tuningData.candidates.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Alternative Candidates:</p>
          <div className="space-y-1">
            {tuningData.candidates.map((c, i) => (
              <div key={i} className="flex justify-between text-xs p-2 bg-[#0d1117] rounded border border-gray-800">
                <span className="text-gray-300 font-bold">{c.name}</span>
                <span className="text-gray-500">{Math.round(c.confidence * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GroovePanel({ analysis }) {
  if (!analysis?.groove) return null;
  const grv = analysis.groove;

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><span>🥁</span> Groove Profile</h3>
        <StatusBadge status={grv.analysis_status} />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Groove Type</p>
          <p className="text-sm font-bold text-orange-400 mt-1">{grv.groove_type || '--'}</p>
        </div>
        <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Swing Ratio</p>
          <p className="text-sm font-bold text-amber-400 mt-1">{grv.swing_ratio ? `${grv.swing_ratio.toFixed(2)}:1` : '--'}</p>
        </div>
      </div>
    </div>
  );
}

export function MappingIntelligencePanel({ analysis, events }) {
  // Derive basic warnings automatically from V2 notes
  const melodicEvents = (events || []).filter(e => e.type !== 'percussion');
  const barreInferredCount = melodicEvents.filter(e => e.mapping_debug?.barre_inferred).length;
  const fallbackCount = melodicEvents.filter(e => e.mapping_debug?.is_fallback).length;
  const alternativesCount = melodicEvents.filter(e => e.alternative_positions?.length > 1).length;
  const avgCost = melodicEvents.length > 0 
    ? (melodicEvents.reduce((acc, e) => acc + (e.mapping_debug?.cost || 0), 0) / melodicEvents.length).toFixed(1)
    : 0;

  return (
    <div className="bg-[#161b22] rounded-xl border border-gray-800 p-5">
      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><span>📐</span> Ergonomics & Mapping</h3>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
         <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Avg State Cost</p>
            <p className="text-sm font-bold text-[#58a6ff] mt-1">{avgCost}</p>
         </div>
         <div className="bg-[#0d1117] rounded-lg p-3 text-center border border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Alternative Paths</p>
            <p className="text-sm font-bold text-green-400 mt-1">{alternativesCount} notes</p>
         </div>
      </div>
      
      <div className="space-y-2">
        {barreInferredCount > 0 && (
          <div className="text-xs flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <span>Barre Proxy Inferences</span>
            <span className="font-bold">{barreInferredCount}</span>
          </div>
        )}
        {fallbackCount > 0 && (
          <div className="text-xs flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400">
            <span>Fallback Cost Bounds Hit</span>
            <span className="font-bold">{fallbackCount}</span>
          </div>
        )}
      </div>
      {(fallbackCount === 0 && barreInferredCount === 0) ? (
        <p className="text-xs text-gray-500 italic mt-2">Viterbi solver found clean mapping geometries.</p>
      ) : null}
    </div>
  );
}

export default function AudioResearchDashboard({ data }) {
  if (!data) {
    return (
      <div className="border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 italic">No V2 data available. (Legacy payload found)</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
      <CoreMetadataPanel metadata={data.metadata} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <TuningAnalysisPanel analysis={data.analysis} />
         <div className="space-y-6">
           <GroovePanel analysis={data.analysis} />
           <MappingIntelligencePanel analysis={data.analysis} events={data.events} />
         </div>
      </div>
    </div>
  );
}
