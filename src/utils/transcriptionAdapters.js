export function isV2Response(response) {
  return !!(response && (response.schema_version === "v2.0" || response.transcription_version === "v2"));
}

/**
 * Normalize a backend transcription response into a canonical internal shape.
 */
export function normalizeTranscriptionResponse(response) {
  if (!response) return null;
  
  if (isV2Response(response)) {
    const eventsObj = response.events || {};
    const noteEvents = Array.isArray(eventsObj) ? eventsObj : (eventsObj.notes || []);
    const percEvents = Array.isArray(eventsObj) ? [] : (eventsObj.percussion || []);
    const techEvents = Array.isArray(eventsObj) ? [] : (eventsObj.techniques || []);
    
    const allEvents = [
      ...noteEvents,
      ...percEvents.map(p => ({ ...p, type: 'percussion' })),
    ];

    const tabColumns = response.tab?.columns || [];
    
    return {
      version: 'v2',
      metadata: response.metadata || {},
      analysis: response.analysis || {},
      events: allEvents,
      techniques: techEvents,
      columns: tabColumns,
      tuningList: response.metadata?.tuning?.selected || [],
      _debug: {
        stages: response._debug_stages || [],
        artifact_path: response._debug_artifact_path || null,
        stats: response._debug_stats || {},
      }
    };
  }

  return {
    version: 'legacy',
    metadata: response.metadata || {},
    analysis: {}, 
    events: response.notes || [],
    columns: response.columns || [],
    tuningList: [],
    _debug: {}
  };
}

/**
 * Convert normalized events → legacy columns for TabViewer.
 * 
 * Key features:
 *  1. Harmonic deduplication: max 1 harmonic per beat
 *  2. Automatic bar lines ("|") every 4 beats (16 columns in 4/4)
 *  3. Note spacing: consecutive notes are close, intervals get proportional gaps
 */
export function toLegacyColumns(normalizedResponse, defaultBpm = 100) {
  if (normalizedResponse.columns && normalizedResponse.columns.length > 0) {
    // Even with backend columns, inject bar lines
    return injectBarLines(normalizedResponse.columns, normalizedResponse.metadata);
  }

  const events = normalizedResponse.events || [];
  if (!Array.isArray(events) || events.length === 0) return [];

  const bpm = normalizedResponse.metadata?.bpm || defaultBpm;
  const bps = bpm / 60;
  const columnTime = 1 / bps / 4; // 16th note resolution
  const timeSignature = normalizedResponse.metadata?.time_signature || [4, 4];
  const beatsPerBar = timeSignature[0] || 4;
  // Columns per bar = beats × 4 (16th note grid per beat)
  const colsPerBar = beatsPerBar * 4;
  
  const validEvents = events.filter(n => typeof n.startTime === 'number' && isFinite(n.startTime));
  if (validEvents.length === 0) return [];

  // Sort events by start time
  validEvents.sort((a, b) => a.startTime - b.startTime);

  const maxTime = Math.max(...validEvents.map(n => n.startTime)) + 1;
  const colCount = Math.min(Math.ceil(maxTime / columnTime), 2000);
  
  const cols = [];
  let lastActiveColIdx = -1;

  for (let i = 0; i < colCount; i++) {
    const tStart = i * columnTime;
    const tEnd = (i + 1) * columnTime;
    const colEvents = validEvents.filter(n => n.startTime >= tStart && n.startTime < tEnd);
    
    if (colEvents.length > 0) {
      const pruned = [];
      const usedStrings = new Set();
      
      // ── Harmonic dedup: max 1 harmonic per column ──
      const harmonicEvents = colEvents.filter(m => m.label === 'NH' || m.label === 'AH');
      const nonHarmonicEvents = colEvents.filter(m => m.label !== 'NH' && m.label !== 'AH');
      
      let bestHarmonic = null;
      if (harmonicEvents.length > 1) {
        // Keep only the one with highest HNR
        bestHarmonic = harmonicEvents.reduce((best, cur) => {
          const bestHnr = best?.technique_features?.hnr ?? best?.raw_confidence ?? 0;
          const curHnr = cur?.technique_features?.hnr ?? cur?.raw_confidence ?? 0;
          return curHnr > bestHnr ? cur : best;
        }, harmonicEvents[0]);
      } else if (harmonicEvents.length === 1) {
        bestHarmonic = harmonicEvents[0];
      }

      const processableEvents = [...nonHarmonicEvents];
      if (bestHarmonic) processableEvents.push(bestHarmonic);

      processableEvents.forEach(m => {
        const isPerc = m.type === 'percussion';
        if (isPerc) {
          pruned.push({ 
            isPerc: true, 
            techLabel: m.technique || m.label || 'x',
            stringIdx: 'perc',
            raw_confidence: m.raw_confidence,
            normalized_confidence: m.normalized_confidence,
            confidence_source: m.confidence_source || 'heuristic',
            tech: m.technique || ''
          });
        } else {
          const sIdx = typeof m.stringIdx === 'number' ? m.stringIdx : null;
          if (sIdx !== null && !usedStrings.has(sIdx)) {
            usedStrings.add(sIdx);
            pruned.push({ 
              stringIdx: sIdx, 
              fretIdx: typeof m.fretIdx === 'number' ? m.fretIdx : 0, 
              tech: m.label === 'NH' ? '<>' : (m.label === 'AH' ? '<>' : ''), 
              techLabel: m.label || '',
              raw_confidence: m.raw_confidence,
              normalized_confidence: m.normalized_confidence,
              confidence_source: m.confidence_source || 'heuristic',
              alternative_positions: m.alternative_positions || [],
              pitch: m.pitch
            });
          }
        }
      });

      if (pruned.length > 0) {
        // ── Note spacing logic ──
        // If there's a gap since the last active column, insert spacers
        // proportional to the interval
        if (lastActiveColIdx >= 0) {
          const gap = i - lastActiveColIdx;
          if (gap > 2 && gap <= 6) {
            // Small gap: 1 spacer
            cols.push({ id: `col-gap-${i}-${Math.random().toString(36).slice(2)}`, type: 'spacer', notes: [] });
          } else if (gap > 6) {
            // Large gap: 2 spacers (proportional visual gap)
            cols.push({ id: `col-gap1-${i}-${Math.random().toString(36).slice(2)}`, type: 'spacer', notes: [] });
            cols.push({ id: `col-gap2-${i}-${Math.random().toString(36).slice(2)}`, type: 'spacer', notes: [] });
          }
          // gap <= 2: notes are consecutive, no spacing needed
        }

        cols.push({ 
          id: `col-v2-${i}-${Math.random().toString(36).slice(2)}`, 
          type: 'melody', 
          notes: pruned,
          _gridPos: i,  // internal: for bar line calculation
        });
        lastActiveColIdx = i;
      }
    }
  }

  // ── Inject bar lines ──
  return injectBarLines(cols, normalizedResponse.metadata);
}

/**
 * Insert bar separator columns ("|") at every N beats.
 * In 4/4 time, a bar = 4 beats = 16 sixteenth-note columns on the grid.
 */
function injectBarLines(columns, metadata = {}) {
  if (!columns || columns.length === 0) return columns;

  const timeSignature = metadata?.time_signature || [4, 4];
  const beatsPerBar = timeSignature[0] || 4;
  const colsPerBar = beatsPerBar * 4; // 16th note grid

  // If columns have _gridPos, use that for bar calculation
  // Otherwise, use sequential index
  const hasGridPos = columns.some(c => typeof c._gridPos === 'number');

  const result = [];
  let lastBarNum = -1;

  columns.forEach((col, idx) => {
    const gridPos = hasGridPos ? (col._gridPos ?? idx) : idx;
    const barNum = Math.floor(gridPos / colsPerBar);

    // Insert bar line when crossing into a new bar
    if (barNum > lastBarNum && lastBarNum >= 0 && col.type !== 'label' && col.type !== 'barline') {
      result.push({
        id: `col-bar-${barNum}-${Math.random().toString(36).slice(2)}`,
        type: 'barline',
        barNumber: barNum,
        notes: [],
      });
    }
    lastBarNum = barNum;

    result.push(col);
  });

  return result;
}

export function extractConfidenceMap(columns) {
  const scores = {};
  if (!Array.isArray(columns)) return scores;
  columns.forEach((col, i) => {
    if (!col.notes || col.notes.length === 0 || col.type === 'barline') {
      scores[i] = 1.0;
      return;
    }
    const confidences = col.notes
      .map(n => n.normalized_confidence ?? n.raw_confidence ?? 0.85)
      .filter(c => typeof c === 'number' && isFinite(c));
    
    scores[i] = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.85;
  });
  return scores;
}
