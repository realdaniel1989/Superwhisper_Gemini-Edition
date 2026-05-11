import { useState, useRef, useEffect } from 'react';
import { streamTranscription } from './lib/api';
import { ToastProvider, useRegisterGlobalToast } from './components/Toast';
import { toast } from './components/Toast';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [livePreview, setLivePreview] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Autostart state
  const [autostartEnabled, setAutostartEnabled] = useState(true);
  const [showAutostartPrompt, setShowAutostartPrompt] = useState(false);
  const autostartAttempted = useRef(false);

  // Broadcast Channel for external recording trigger
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const wavePointsRef = useRef<number[]>([]);

  // Derived display state
  const displayState: 'idle' | 'recording' | 'transcribing' | 'result' =
    isRecording ? 'recording'
    : isTranscribing && !transcription ? 'transcribing'
    : transcription ? 'result'
    : 'idle';

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Broadcast Channel for external recording trigger
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('superwhisper-recording');
    broadcastChannelRef.current = channel;

    channel.onmessage = async (event) => {
      const { action } = event.data;

      if (!isOnline) {
        channel.postMessage({ type: 'error', message: 'Offline - cannot record' });
        return;
      }

      switch (action) {
        case 'start':
          if (!isRecording) {
            await startRecording();
            toast("Recording started", { type: 'success' });
            channel.postMessage({ type: 'status', recording: true });
          }
          break;
        case 'stop':
          if (isRecording) {
            stopRecording();
            toast("Recording stopped", { type: 'success' });
            channel.postMessage({ type: 'status', recording: false });
          }
          break;
        case 'toggle':
          if (isRecording) {
            stopRecording();
            toast("Recording stopped", { type: 'success' });
            channel.postMessage({ type: 'status', recording: false });
          } else {
            await startRecording();
            toast("Recording started", { type: 'success' });
            channel.postMessage({ type: 'status', recording: true });
          }
          break;
        case 'status':
          channel.postMessage({ type: 'status', recording: isRecording });
          break;
      }
    };

    (window as any).superwhisper = {
      start: () => channel.postMessage({ action: 'start' }),
      stop: () => channel.postMessage({ action: 'stop' }),
      toggle: () => channel.postMessage({ action: 'toggle' }),
      status: () => channel.postMessage({ action: 'status' }),
    };

    return () => {
      channel.close();
      delete (window as any).superwhisper;
    };
  }, [isRecording, isOnline]);

  // Keyboard shortcut for recording toggle (Cmd/Ctrl + Shift + R)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (!isOnline) return;
        if (isRecording) {
          stopRecording();
          toast("Recording stopped", { type: 'success' });
        } else {
          await startRecording();
          toast("Recording started", { type: 'success' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, isOnline]);

  // Autostart recording from URL parameter
  useEffect(() => {
    if (autostartAttempted.current || !isOnline) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true') {
      autostartAttempted.current = true;

      if (autostartEnabled) {
        setShowAutostartPrompt(true);
      }
    }
  }, [isOnline, autostartEnabled]);

  // Waveform oscilloscope rendering
  useEffect(() => {
    if (!isRecording || !canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const ctx = canvas.getContext('2d')!;
    const parent = canvas.parentElement!;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const SPEED = 1.0;

    wavePointsRef.current = [];

    function resize() {
      const r = parent.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();

    function draw() {
      analyser.getByteTimeDomainData(dataArray);

      const w = parent.getBoundingClientRect().width;
      const h = parent.getBoundingClientRect().height;
      if (w === 0 || h === 0) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // Take center sample for scrolling trace
      const center = dataArray[Math.floor(bufferLength / 2)];
      const sample = (center - 128) / 128;
      wavePointsRef.current.push(sample);
      if (wavePointsRef.current.length > Math.ceil(w / SPEED) + 50) {
        wavePointsRef.current.shift();
      }

      // Update level meter via RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(7, Math.max(0, Math.round(rms * 14)));

      if (meterRef.current) {
        const bars = meterRef.current.children;
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i] as HTMLElement;
          bar.classList.toggle('on', i < level);
          bar.classList.toggle('hot', i < level && i >= 5);
        }
      }

      const points = wavePointsRef.current;
      const midY = h / 2;
      const amp = h * 0.32;

      // Faint glow trail
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(198, 247, 78, 0.10)';
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = w - (points.length - 1 - i) * SPEED;
        const y = midY + points[i] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sharp main trace
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#c6f74e';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = w - (points.length - 1 - i) * SPEED;
        const y = midY + points[i] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Leading dot
      const lastY = midY + points[points.length - 1] * amp;
      ctx.fillStyle = '#c6f74e';
      ctx.shadowColor = 'rgba(198, 247, 78, 0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(w - 1, lastY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
      wavePointsRef.current = [];
    };
  }, [isRecording]);

  const handleAutostartConfirm = async () => {
    setShowAutostartPrompt(false);
    await startRecording();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeFull = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (blob: Blob, duration: number) => {
    setIsTranscribing(true);
    setTranscription('');
    try {
      const text = await streamTranscription(blob);
      setTranscription(text);

      if (text.trim()) {
        try {
          window.focus();
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast("Transcription complete — copied to clipboard", { type: 'success' });
          } else {
            toast("Transcription complete", { type: 'success' });
          }
        } catch (err) {
          console.log('Auto-copy not available:', err);
          toast("Transcription complete", { type: 'success' });
        }
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscription("Error transcribing audio. Please try again.");
    } finally {
      setIsTranscribing(false);
      setLivePreview('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      });

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        ''
      ];
      const mimeType = mimeTypes.find(type => !type || MediaRecorder.isTypeSupported(type)) || '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Audio analysis — analyser ref must be set before setIsRecording
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(audioBlob);
        transcribeAudio(audioBlob, recordingTime);
        stream.getTracks().forEach(track => track.stop());

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setLivePreview('');

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setLivePreview(finalTranscript + interimTranscript);
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.error("Speech recognition error", e);
        }
      }

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
        recognitionRef.current = null;
      }
    }
  };

  const copyToClipboard = async () => {
    if (!transcription) return;
    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const clearAll = () => {
    setTranscription('');
    setLivePreview('');
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Hero content per state
  const heroContent: Record<string, { label: string; headline: React.ReactNode }> = {
    idle:        { label: 'Standby',   headline: <>Speak, and <em>I&rsquo;ll listen</em>.</> },
    recording:   { label: 'Now recording', headline: <><span className="signal">Listening</span> closely.</> },
    transcribing:{ label: 'Processing',    headline: <>Turning sound <em>into words</em>.</> },
    result:      { label: 'Complete',       headline: <><span className="accent">Transcribed.</span> Yours to keep.</> },
  };

  const hero = heroContent[displayState];

  return (
    <>
      <main className="page">

        {/* ===== TOP BAR ===== */}
        <header className="top-bar">
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-name">Jedi <em>&middot;</em> Whispers</div>
          </div>
          <div className="session-meta">
            <span>DICTATION</span>
            <span className="dot" />
            <span>whisper-large-v3</span>
          </div>
          <div className="top-bar-right">
            <span>Record</span>
            <span className="kbd">⌘</span>
            <span className="kbd">⇧</span>
            <span className="kbd">R</span>
          </div>
        </header>

        {/* ===== HERO ===== */}
        <section className="hero">
          <div className="hero-label">{hero.label}</div>
          <h1 className="hero-headline">{hero.headline}</h1>
        </section>

        {/* ===== SURFACE CARD ===== */}
        <section className="surface">

          {/* Strip */}
          <div className="surface-strip">
            <span className={`strip-status${displayState === 'recording' ? ' live' : displayState === 'transcribing' ? ' work' : displayState === 'result' ? ' done' : ''}`}>
              <span className="dot" />
              <span>{displayState === 'idle' ? 'STANDBY' : displayState === 'recording' ? 'RECORDING' : displayState === 'transcribing' ? 'TRANSCRIBING' : 'COMPLETE'}</span>
            </span>
            <span className="strip-center">Take 01 &middot; 48kHz &middot; MONO</span>
            <span className={`strip-timer${displayState === 'recording' ? ' live' : ''}`}>
              {formatTimeFull(recordingTime)}
            </span>
          </div>

          {/* Oscilloscope (recording only) */}
          {isRecording && (
            <div className="scope">
              <canvas ref={canvasRef} />
              <div className="scope-axis">CH 01 &middot; INPUT</div>
              <div className="scope-meter">
                <span>LVL</span>
                <div className="meter-bars" ref={meterRef}>
                  <div className="meter-bar" style={{ height: 3 }} />
                  <div className="meter-bar" style={{ height: 5 }} />
                  <div className="meter-bar" style={{ height: 7 }} />
                  <div className="meter-bar" style={{ height: 9 }} />
                  <div className="meter-bar" style={{ height: 11 }} />
                  <div className="meter-bar" style={{ height: 13 }} />
                  <div className="meter-bar" style={{ height: 14 }} />
                </div>
              </div>
            </div>
          )}

          {/* ===== CONTENT STATES ===== */}

          {/* Idle */}
          {displayState === 'idle' && (
            <div className="idle-state">
              <div className="idle-meta">No active recording</div>
              <div className="idle-prompt">
                Hit the dial below, or use the shortcut. <em>Anything you say will be set down.</em>
              </div>
              <div className="idle-hint">Auto-stops after 4s of silence.</div>
            </div>
          )}

          {/* Recording — live preview */}
          {displayState === 'recording' && (
            <div className="transcript-body">
              <p className="transcript-text draft">
                {livePreview || 'Listening...'}<span className="caret" />
              </p>
            </div>
          )}

          {/* Transcribing */}
          {displayState === 'transcribing' && (
            <div className="transcribing-state">
              <div className="transcribing-label">Transcribing <em>your voice</em>&hellip;</div>
              <div className="progress-track" />
              <div className="transcribing-meta">
                <span>whisper &middot; large-v3</span>
                <span>{recordingTime} sec audio</span>
              </div>
            </div>
          )}

          {/* Result */}
          {displayState === 'result' && (
            <div className="transcript-body">
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                className="transcript-text"
              />
            </div>
          )}

          {/* ===== CONTROLS ===== */}
          <div className="controls">
            {/* Left */}
            <div className="control-left">
              {displayState === 'idle' && (
                <button
                  onClick={() => setAutostartEnabled(!autostartEnabled)}
                  className={`pill${autostartEnabled ? ' accent' : ''}`}
                  title={autostartEnabled ? 'Autostart enabled' : 'Autostart disabled'}
                >
                  <span className="ico">
                    <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
                      <path d="M9 2L3 9h4l-1 5 6-7H8l1-5z" fill="currentColor" />
                    </svg>
                  </span>
                  AUTO-START
                </button>
              )}

              {displayState === 'recording' && (
                <div className="timer-tag live">
                  <span className="lbl">REC</span>
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}

              {(displayState === 'transcribing' || displayState === 'result') && (
                <div className="timer-tag">
                  <span className="lbl">LEN</span>
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            {/* Center — record dial */}
            <div className="record-wrap">
              <button
                className={`record-btn${isRecording ? ' live' : ''}`}
                onClick={isRecording ? stopRecording : isOnline ? startRecording : undefined}
                disabled={!isRecording && !isOnline}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <span className="record-disc">
                  {!isRecording && (
                    <svg viewBox="0 0 24 24">
                      <rect x="9" y="3" width="6" height="11" rx="3" />
                      <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  )}
                </span>
              </button>
              <span className={`record-label${isRecording ? ' live' : ''}`}>
                {isRecording ? 'STOP' : displayState === 'transcribing' ? 'PROCESSING' : 'RECORD'}
              </span>
            </div>

            {/* Right */}
            <div className="control-right">
              {displayState === 'result' && (
                <>
                  <button className="icon-btn" onClick={copyToClipboard} title="Copy to clipboard">
                    {copied ? (
                      <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <rect x="9" y="9" width="11" height="11" rx="1" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    )}
                  </button>
                  <button className="icon-btn danger" onClick={clearAll} title="Discard">
                    <svg viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="footer">
          <span>Jedi Whispers</span>
          <span className="center">&mdash; set in Geist &amp; Instrument Serif &mdash;</span>
          <span>v 0.4.7</span>
        </footer>

      </main>

      {/* ===== AUTOSTART MODAL ===== */}
      {showAutostartPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <h3 className="modal-title">Ready to Record</h3>
            <p className="modal-body">
              Click below to start recording. Your browser requires this click to access the microphone.
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowAutostartPrompt(false)} className="modal-btn">
                Cancel
              </button>
              <button onClick={handleAutostartConfirm} className="modal-btn primary">
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Inner component that registers global toast
function AppWithToast() {
  useRegisterGlobalToast();
  return <App />;
}

// Main export wrapped with ToastProvider
export default function AppRoot() {
  return (
    <ToastProvider>
      <AppWithToast />
    </ToastProvider>
  );
}
