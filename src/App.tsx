import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Copy, Trash2, Check, Loader2, Clock, Zap } from 'lucide-react';
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
  const [audioLevel, setAudioLevel] = useState(0);
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

  // Offline detection - block recording when offline
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

      // Ignore if offline
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
          // Respond to status query
          channel.postMessage({ type: 'status', recording: isRecording });
          break;
      }
    };

    // Expose global helper for console/bookmarklet use
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
      // Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();

        // Ignore if offline
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
    // Skip if already attempted or offline
    if (autostartAttempted.current || !isOnline) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true') {
      autostartAttempted.current = true;

      // If autostart is enabled, show prompt
      // (Browser requires user gesture for microphone access)
      if (autostartEnabled) {
        setShowAutostartPrompt(true);
      }
    }
  }, [isOnline, autostartEnabled]);

  const handleAutostartConfirm = async () => {
    setShowAutostartPrompt(false);
    await startRecording();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (blob: Blob, duration: number) => {
    setIsTranscribing(true);
    setTranscription('');
    try {
      const text = await streamTranscription(blob);
      setTranscription(text);

      if (text.trim()) {
        // Auto-copy transcription to clipboard (works in Chrome, Safari blocks without user gesture)
        try {
          window.focus();
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            toast("Transcription complete - copied to clipboard", { type: 'success' });
          } else {
            toast("Transcription complete", { type: 'success' });
          }
        } catch (err) {
          // Safari requires explicit user gesture for clipboard access
          // User can manually click the copy button
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
      // Request high-quality audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      });

      // Determine supported MIME type (browser compatibility)
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        '' // Let browser choose as fallback
      ];
      const mimeType = mimeTypes.find(type => !type || MediaRecorder.isTypeSupported(type)) || '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setAudioLevel(average);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

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

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-900 font-sans flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-neutral-100 to-transparent -z-10" />
      
      <div className="w-full max-w-3xl space-y-8 relative z-10">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900 flex items-center gap-2">
            <Mic className="w-6 h-6 text-neutral-400" />
            Dictate
          </h1>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200/60 overflow-hidden">
          <div className="p-8 min-h-[400px] flex flex-col">
            {isTranscribing && !transcription ? (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse" />
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500 relative z-10" />
                </div>
                <p className="text-sm font-medium tracking-wide uppercase text-neutral-500">Processing audio...</p>
              </div>
            ) : (transcription || isRecording || livePreview) ? (
              <textarea
                value={isRecording ? livePreview : transcription}
                onChange={(e) => setTranscription(e.target.value)}
                readOnly={isRecording || isTranscribing}
                className={`flex-1 w-full resize-none outline-none text-xl leading-relaxed bg-transparent placeholder:text-neutral-300 ${isRecording ? 'text-neutral-400' : 'text-neutral-800'}`}
                placeholder={isRecording ? "Listening..." : "Your transcription will appear here..."}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-300 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                  <Mic className="w-8 h-8 text-neutral-200" />
                </div>
                <p className="text-lg font-light">Ready to record</p>
              </div>
            )}
          </div>
          
          <div className="bg-neutral-50/50 border-t border-neutral-100 p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4 w-32">
              {isRecording ? (
                <div className="flex items-center space-x-3 text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-sm font-medium">{formatTime(recordingTime)}</span>
                </div>
              ) : (audioBlob || transcription) ? (
                 <div className="flex items-center space-x-2 text-neutral-500 px-3 py-1.5">
                  <Clock className="w-4 h-4 opacity-70" />
                  <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <button
                  onClick={() => setAutostartEnabled(!autostartEnabled)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
                    autostartEnabled
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                  }`}
                  title={autostartEnabled ? 'Autostart enabled - recording will auto-start with ?autostart=true' : 'Autostart disabled'}
                >
                  <Zap className={`w-4 h-4 ${autostartEnabled ? 'fill-current' : ''}`} />
                  <span className="text-xs font-medium">Auto</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center relative">
              {isRecording && (
                <div 
                  className="absolute inset-0 bg-red-500 rounded-full opacity-20 transition-transform duration-75 ease-out pointer-events-none"
                  style={{ transform: `scale(${1 + (audioLevel / 255) * 0.8})` }}
                />
              )}
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/30 relative z-10"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={!isOnline}
                  title={isOnline ? "Start recording" : "Recording unavailable - you're offline"}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-neutral-900/20 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-900"
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-2 w-32">
               {transcription && (
                 <>
                   <button 
                     onClick={copyToClipboard} 
                     className="p-2.5 text-neutral-500 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-200/50"
                     title="Copy to clipboard"
                   >
                     {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                   </button>
                   <button 
                     onClick={clearAll} 
                     className="p-2.5 text-neutral-500 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                     title="Clear"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Autostart Prompt Modal - requires user click for microphone access */}
      {showAutostartPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Ready to Record</h3>
            <p className="text-neutral-500 text-sm mb-6">
              Click below to start recording. Your browser requires this click to access the microphone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAutostartPrompt(false)}
                className="flex-1 px-4 py-2.5 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAutostartConfirm}
                className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
              >
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
