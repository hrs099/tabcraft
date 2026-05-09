import { useEffect } from 'react';

export function useKeyboardEditorShortcuts({
  onArrowRight,
  onArrowLeft,
  onPlayToggle,
  onDelete,
  onUndo,
  onToggleLayers,
  onMetronomeToggle,
  onLoopToggle,
  onSave,
  onClear,
  onPdfExport,
  onArticSelect,
  onEscape,
  enabled = true
}) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      // 1. Ignore if typing in an input, textarea, or contentEditable
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // 2. Map safe combinations
      
      const key = e.key.toLowerCase();

      // Metronome: M
      if (key === 'm') {
        if (onMetronomeToggle) onMetronomeToggle();
        return;
      }

      // Loop: L
      if (key === 'l' && !e.ctrlKey && !e.metaKey) {
        if (onLoopToggle) onLoopToggle();
        return;
      }

      // Save: Cmd/Ctrl + S
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        if (onSave) onSave();
        return;
      }

      // Clear: Cmd/Ctrl + Backspace
      if ((e.ctrlKey || e.metaKey) && key === 'backspace') {
        e.preventDefault();
        if (onClear) onClear();
        return;
      }

      // PDF: P
      if (key === 'p' && !e.ctrlKey && !e.metaKey) {
        if (onPdfExport) onPdfExport();
        return;
      }

      // Articulation Selection: 1-9
      if (key >= '1' && key <= '9') {
        if (onArticSelect) onArticSelect(parseInt(key) - 1);
        return;
      }

      // Escape: Deselect / Close
      if (e.key === 'Escape') {
        if (onEscape) onEscape();
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (onUndo) onUndo();
        return;
      }

      // Navigation: Arrow Keys
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (onArrowRight) onArrowRight();
        return;
      }
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (onArrowLeft) onArrowLeft();
        return;
      }

      // Playback: Space
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (onPlayToggle) onPlayToggle();
        return;
      }

      // Deletion: Delete / Backspace
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (onDelete) onDelete(e);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onArrowRight, onArrowLeft, onPlayToggle, onDelete, onUndo, onToggleLayers, onMetronomeToggle, onLoopToggle, onSave, onClear, onPdfExport, onArticSelect, onEscape, enabled]);
}
