import { useState, useCallback } from 'react';
import type { Note, Bar, PercussionEvent } from '../mocks/demoData';
import { mockBars, mockNotes, mockPercussion } from '../mocks/demoData';

export function useTranscription() {
  const [bars] = useState<Bar[]>(mockBars);
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [percussions] = useState<PercussionEvent[]>(mockPercussion);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filterLowConfidence, setFilterLowConfidence] = useState(false);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, isUserCorrected: true } : n));
  }, []);

  const markNoteReviewed = useCallback((id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isUserCorrected: true } : n));
  }, []);

  const getSuggestionsForNote = (noteId: string) => {
    // Generate mock alternate suggestions based on the note ID
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    
    // Just some dummy logic to produce 2 options for any selected note
    return [
      { id: `${noteId}-s1`, string: note.string === 6 ? 5 : note.string + 1, fret: note.fret + 5, techniqueTags: [] },
      { id: `${noteId}-s2`, string: note.string === 1 ? 2 : note.string - 1, fret: Math.max(0, note.fret - 5), techniqueTags: ['hammer-on'] },
    ];
  };

  return {
    bars,
    notes,
    percussions,
    selectedNoteId,
    setSelectedNoteId,
    filterLowConfidence,
    setFilterLowConfidence,
    updateNote,
    markNoteReviewed,
    getSuggestionsForNote,
  };
}

// Extend Note interface to include isUserCorrected
declare module '../mocks/demoData' {
  interface Note {
    isUserCorrected?: boolean;
  }
}
