import { useState, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function useV2Transcription() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const [backendOnline, setBackendOnline] = useState(null);

  // Health check polling
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled) setBackendOnline(res.ok);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 5000); // Check every 5 seconds

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const transcribe = async ({ file, backendTuningJson, suggestGroove, forceV2 = true, percussives = {} }) => {
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tuning', backendTuningJson);
      formData.append('suggest_groove', suggestGroove ? 'true' : 'false');
      formData.append('percussives', JSON.stringify(percussives));

      setProgress(20);

      // We explicitly hit /api/v2/transcribe now.
      const endpoint = forceV2 ? `${BACKEND_URL}/api/v2/transcribe` : `${BACKEND_URL}/api/transcribe`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody.detail?.message) {
            detail = `[${errBody.detail.error}] ${errBody.detail.message}`;
          }
        } catch { /* ignore parse failures */ }
        throw new Error(`Backend error (${response.status}): ${detail}`);
      }

      const responseJson = await response.json();
      setProgress(90);

      setData(responseJson);
      setProgress(100);
      setIsProcessing(false);

      // Notify user if backgrounded
      if (document.visibilityState === 'hidden') {
        if (Notification.permission === 'granted') {
          new Notification('Transcription Complete! 🎸', {
            body: 'Your guitar tab is ready for viewing.',
            icon: '/favicon.ico'
          });
        }
      }
      return responseJson;

    } catch (err) {
      console.error('[useV2Transcription] Transcription failed:', err);
      setError(err.message);
      setIsProcessing(false);
      throw err;
    }
  };

  return { transcribe, isProcessing, progress, data, error, backendOnline };
}
