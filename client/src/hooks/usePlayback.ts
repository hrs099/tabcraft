import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Bar, Note, PercussionEvent } from '../mocks/demoData';
import { mockVideo } from '../mocks/demoData';

export interface PlaybackState {
  currentTime: number; // in seconds
  isPlaying: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  playbackSpeed: number;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setLoop: (start: number, end: number) => void;
  clearLoop: () => void;
  setSpeed: (speed: number) => void;
}

export interface PlaybackContextData extends PlaybackState {
  controls: PlaybackControls;
  currentBars: Bar[];
  currentNotes: Note[];
  currentPercussions: PercussionEvent[];
  duration: number;
}

export function usePlayback(sourceBars: Bar[] = [], sourceNotes: Note[] = [], sourcePercussions: PercussionEvent[] = []): PlaybackContextData {
  const [state, setState] = useState<PlaybackState>({
    currentTime: 0,
    isPlaying: false,
    loopStart: null,
    loopEnd: null,
    playbackSpeed: 1,
  });

  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Use a ref for state to access latest values in RAF without dependency issues
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const duration = mockVideo.duration;

  const updateTime = useCallback((newTime: number) => {
    setState((prev) => {
      let boundedTime = Math.max(0, Math.min(newTime, duration));
      
      // Handle looping logic
      if (prev.loopStart !== null && prev.loopEnd !== null) {
        if (boundedTime >= prev.loopEnd) {
          boundedTime = prev.loopStart;
        } else if (boundedTime < prev.loopStart) {
          boundedTime = prev.loopStart;
        }
      }
      
      return { ...prev, currentTime: boundedTime };
    });
  }, [duration]);

  const loop = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaMs = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const currentSt = stateRef.current;

    if (currentSt.isPlaying) {
      const deltaSec = (deltaMs / 1000) * currentSt.playbackSpeed;
      updateTime(currentSt.currentTime + deltaSec);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [updateTime]);

  useEffect(() => {
    if (state.isPlaying) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying, loop]);

  const controls: PlaybackControls = useMemo(() => ({
    play: () => setState((prev) => ({ ...prev, isPlaying: true })),
    pause: () => setState((prev) => ({ ...prev, isPlaying: false })),
    togglePlay: () => setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying })),
    seek: (time: number) => updateTime(time),
    setLoop: (start: number, end: number) => setState((prev) => ({ ...prev, loopStart: start, loopEnd: end })),
    clearLoop: () => setState((prev) => ({ ...prev, loopStart: null, loopEnd: null })),
    setSpeed: (speed: number) => setState((prev) => ({ ...prev, playbackSpeed: speed })),
  }), [updateTime]);

  // Derived state: what is currently active based on currentTime
  const currentBars = useMemo(() => {
    return sourceBars.filter(bar => state.currentTime >= bar.startTime && state.currentTime <= bar.endTime);
  }, [state.currentTime, sourceBars]);

  const currentNotes = useMemo(() => {
    return sourceNotes.filter(note => state.currentTime >= note.startTime && state.currentTime <= note.endTime);
  }, [state.currentTime, sourceNotes]);

  const currentPercussions = useMemo(() => {
    return sourcePercussions.filter(p => state.currentTime >= p.startTime && state.currentTime <= p.endTime);
  }, [state.currentTime, sourcePercussions]);

  return {
    ...state,
    controls,
    currentBars,
    currentNotes,
    currentPercussions,
    duration,
  };
}
