export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  mode: 'percussive' | 'standard' | 'strumming';
  status: 'analyzing' | 'ready' | 'error';
  sourceType: 'video' | 'audio';
}

export interface Video {
  id: string;
  fileName: string;
  duration: number; // in seconds
  fps: number;
  width: number;
  height: number;
  audioTrack: boolean;
  thumbnail: string;
}

export interface Bar {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  timeSignature: string;
  confidence: number;
}

export interface Beat {
  id: string;
  barId: string;
  index: number;
  startTime: number;
  endTime: number;
}

export interface Note {
  id: string;
  startTime: number;
  endTime: number;
  pitch: number; // MIDI pitch
  string: number; // 1-6 (1 is high E)
  fret: number;
  bar: number; // bar index
  beat: number; // beat index
  confidence: number; // 0-1
  techniqueTags: string[];
  leftHandFinger?: number;
  rightHandFinger?: string; // 'p', 'i', 'm', 'a'
  velocity: number;
}

export interface PercussionEvent {
  id: string;
  type: 'slap' | 'tap' | 'wrist-thump' | 'nail-attack';
  startTime: number;
  endTime: number;
  confidence: number;
  labelMode: 'auto' | 'manual';
  linkedBar: number;
  linkedBeat: number;
}

export const mockProject: Project = {
  id: 'proj-001',
  title: 'Acoustic Groove Demo',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mode: 'percussive',
  status: 'ready',
  sourceType: 'video',
};

export const mockVideo: Video = {
  id: 'vid-001',
  fileName: 'acoustic_groove.mp4',
  duration: 15.5,
  fps: 30,
  width: 1920,
  height: 1080,
  audioTrack: true,
  thumbnail: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80',
};

export const mockBars: Bar[] = [
  { id: 'bar-1', index: 1, startTime: 0, endTime: 2, timeSignature: '4/4', confidence: 0.95 },
  { id: 'bar-2', index: 2, startTime: 2, endTime: 4, timeSignature: '4/4', confidence: 0.88 },
  { id: 'bar-3', index: 3, startTime: 4, endTime: 6, timeSignature: '4/4', confidence: 0.92 },
];

export const mockNotes: Note[] = [
  // Bar 1
  { id: 'n1', startTime: 0.0, endTime: 0.5, pitch: 40, string: 6, fret: 0, bar: 1, beat: 1, confidence: 0.98, techniqueTags: [], velocity: 80 },
  { id: 'n2', startTime: 0.5, endTime: 1.0, pitch: 45, string: 5, fret: 0, bar: 1, beat: 2, confidence: 0.95, techniqueTags: [], velocity: 75 },
  { id: 'n3', startTime: 1.0, endTime: 1.5, pitch: 50, string: 4, fret: 2, bar: 1, beat: 3, confidence: 0.90, techniqueTags: ['hammer-on'], velocity: 85 },
  { id: 'n4', startTime: 1.5, endTime: 2.0, pitch: 52, string: 4, fret: 4, bar: 1, beat: 4, confidence: 0.85, techniqueTags: [], velocity: 70 },
  // Bar 2
  { id: 'n5', startTime: 2.0, endTime: 2.5, pitch: 43, string: 6, fret: 3, bar: 2, beat: 1, confidence: 0.97, techniqueTags: [], velocity: 80 },
  { id: 'n6', startTime: 2.5, endTime: 3.0, pitch: 47, string: 5, fret: 2, bar: 2, beat: 2, confidence: 0.91, techniqueTags: [], velocity: 75 },
  { id: 'n7', startTime: 3.0, endTime: 4.0, pitch: 55, string: 3, fret: 0, bar: 2, beat: 3, confidence: 0.80, techniqueTags: [], velocity: 90 }, // Low confidence example
];

export const mockPercussion: PercussionEvent[] = [
  { id: 'p1', type: 'slap', startTime: 0.5, endTime: 0.6, confidence: 0.92, labelMode: 'auto', linkedBar: 1, linkedBeat: 2 },
  { id: 'p2', type: 'wrist-thump', startTime: 1.0, endTime: 1.2, confidence: 0.85, labelMode: 'auto', linkedBar: 1, linkedBeat: 3 },
  { id: 'p3', type: 'slap', startTime: 2.5, endTime: 2.6, confidence: 0.90, labelMode: 'auto', linkedBar: 2, linkedBeat: 2 },
];
