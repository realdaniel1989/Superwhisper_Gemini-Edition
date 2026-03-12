import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Copy, Trash2, Check, Loader2, Clock, History, X, ChevronRight, LogIn, LogOut, Settings, ExternalLink, AlertCircle, Zap } from 'lucide-react';
import { streamTranscription } from './lib/api';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ToastProvider, useRegisterGlobalToast } from './components/Toast';
import { toast } from './components/Toast';
import { saveDictation as saveDictationToDb, loadDictations as loadDictationsFromDb, deleteDictation as deleteDictationFromDb, type DictationRow } from './lib/dictations';

interface Dictation {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
  hasError?: boolean;
}

// Setup screen shown when Supabase isn't configured
function SetupScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-medium text-neutral-900">Setup Required</h1>
        </div>

        <p className="text-neutral-600 mb-6">
          Authentication requires Supabase credentials. Follow these steps to get started:
        </p>

        <ol className="space-y-4 mb-6">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-sm font-medium flex items-center justify-center">1</span>
            <div>
              <p className="text-neutral-900 font-medium">Create a Supabase project</p>
              <a
                href="https://supabase.com/dashboard/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
              >
                supabase.com/dashboard/new
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-sm font-medium flex items-center justify-center">2</span>
            <div>
              <p className="text-neutral-900 font-medium">Get your credentials</p>
              <p className="text-neutral-500 text-sm">Project Settings → API → URL and anon/public key</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-sm font-medium flex items-center justify-center">3</span>
            <div>
              <p className="text-neutral-900 font-medium">Create <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">.env</code> file</p>
              <pre className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-sm font-medium flex items-center justify-center">4</span>
            <div>
              <p className="text-neutral-900 font-medium">Enable Email Auth</p>
              <p className="text-neutral-500 text-sm">Authentication → Providers → Email → Enable</p>
            </div>
          </li>
        </ol>

        <p className="text-neutral-500 text-sm">
          Restart the dev server after creating the <code className="bg-neutral-100 px-1 py-0.5 rounded">.env</code> file.
        </p>
      </div>
    </div>
  );
}

function App() {
  const { user, loading, isConfigured, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [livePreview, setLivePreview] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Autostart state
  const [autostartEnabled, setAutostartEnabled] = useState(true);
  const [showAutostartPrompt, setShowAutostartPrompt] = useState(false);
  const autostartAttempted = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load dictations from Supabase when user is authenticated
  useEffect(() => {
    if (!user) {
      setDictations([]);
      return;
    }

    const loadFromDb = async () => {
      const { data, error } = await loadDictationsFromDb(user.id);
      if (error) {
        console.error("Failed to load dictations:", error);
        toast("Failed to load dictations. Please refresh the page.");
        return;
      }
      if (data) {
        setDictations(data.map((row: DictationRow) => ({
          id: row.id,
          text: row.text,
          timestamp: row.timestamp,
          duration: row.duration,
        })));
      }
    };

    loadFromDb();
  }, [user]);

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

  // Autostart recording from URL parameter
  useEffect(() => {
    // Skip if already attempted, still loading, or offline
    if (autostartAttempted.current || loading || !isOnline) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === 'true') {
      autostartAttempted.current = true;

      // If not logged in, disable autostart and notify user
      if (!user) {
        setAutostartEnabled(false);
        toast("Autostart disabled - log in and toggle to enable", { type: 'info' });
        return;
      }

      // If autostart is enabled and user is logged in, show prompt
      // (Browser requires user gesture for microphone access)
      if (autostartEnabled) {
        setShowAutostartPrompt(true);
      }
    }
  }, [user, loading, isOnline, autostartEnabled]);

  const handleAutostartConfirm = async () => {
    setShowAutostartPrompt(false);
    await startRecording();
  };

  const saveDictation = async (text: string, duration: number) => {
    if (!text.trim() || !user) return;

    // Optimistic update - add to local state immediately
    const tempId = Date.now().toString();
    const newDictation: Dictation = {
      id: tempId,
      text,
      timestamp: Date.now(),
      duration
    };
    setDictations((prev) => [newDictation, ...prev]);

    // Save to database in background
    const { data, error } = await saveDictationToDb(user.id, text, duration);

    if (error) {
      console.error("Failed to save dictation:", error);
      // Mark as error in UI
      setDictations((prev) =>
        prev.map((d) => d.id === tempId ? { ...d, hasError: true } : d)
      );
      toast("Failed to save dictation", {
        type: 'error',
        action: {
          label: 'Retry',
          onClick: () => retrySave(tempId, text, duration)
        }
      });
    } else if (data) {
      // Replace temp ID with real database ID
      setDictations((prev) =>
        prev.map((d) => d.id === tempId ? { ...d, id: data.id } : d)
      );
    }
  };

  const retrySave = async (tempId: string, text: string, duration: number) => {
    if (!user) return;

    // Clear error state optimistically
    setDictations((prev) =>
      prev.map((d) => d.id === tempId ? { ...d, hasError: false } : d)
    );

    const { data, error } = await saveDictationToDb(user.id, text, duration);

    if (error) {
      console.error("Failed to retry save:", error);
      setDictations((prev) =>
        prev.map((d) => d.id === tempId ? { ...d, hasError: true } : d)
      );
      toast("Failed to save dictation");
    } else if (data) {
      setDictations((prev) =>
        prev.map((d) => d.id === tempId ? { ...d, id: data.id, hasError: false } : d)
      );
    }
  };

  const deleteDictation = async (id: string) => {
    if (!user) return;

    // Optimistic update - remove from local state immediately
    const previous = dictations;
    setDictations((prev) => prev.filter((d) => d.id !== id));

    const { error } = await deleteDictationFromDb(user.id, id);

    if (error) {
      console.error("Failed to delete dictation:", error);
      // Restore on error
      setDictations(previous);
      toast("Failed to delete dictation");
    }
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
        saveDictation(text, duration);
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

  const loadDictation = (d: Dictation) => {
    setTranscription(d.text);
    setRecordingTime(d.duration);
    setAudioBlob(null);
    setShowHistory(false);
  };

  // Show loading spinner during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Show setup instructions if Supabase isn't configured
  if (!isConfigured) {
    return <SetupScreen />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-900 font-sans flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-neutral-100 to-transparent -z-10" />
      
      <div className="w-full max-w-3xl space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900 flex items-center gap-2">
              <Mic className="w-6 h-6 text-neutral-400" />
              Dictate
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors shadow-sm"
            >
              <History className="w-4 h-4" />
              History
            </button>
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Log in
              </button>
            )}
          </div>
        </div>
        
        <div className="relative">
          <div className={`bg-white rounded-3xl shadow-sm border border-neutral-200/60 overflow-hidden transition-all duration-300 ${showHistory ? 'opacity-0 pointer-events-none absolute inset-0 scale-95' : 'opacity-100 scale-100 relative'}`}>
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

          <div className={`bg-white rounded-3xl shadow-sm border border-neutral-200/60 overflow-hidden transition-all duration-300 ${showHistory ? 'opacity-100 scale-100 relative' : 'opacity-0 pointer-events-none absolute inset-0 scale-95'}`}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h2 className="text-lg font-medium text-neutral-900">Recent Dictations</h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 max-h-[500px] overflow-y-auto">
              {dictations.length === 0 ? (
                <div className="p-12 text-center text-neutral-400">
                  <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No dictations yet.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {dictations.map((d) => (
                    <div
                      key={d.id}
                      className="group flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => loadDictation(d)}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className="text-neutral-900 font-medium truncate">
                            {d.text}
                          </p>
                          {d.hasError && (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" title="Failed to save" />
                          )}
                        </div>
                        <div className="flex items-center text-xs text-neutral-500 space-x-3">
                          <span>{new Date(d.timestamp).toLocaleDateString()} {new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span>•</span>
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatTime(d.duration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.hasError && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retrySave(d.id, d.text, d.duration);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 shadow-sm transition-colors"
                            title="Retry save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDictation(d.id);
                          }}
                          className="p-2 text-neutral-400 hover:text-red-500 rounded-full hover:bg-white shadow-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="p-2 text-neutral-400 bg-white rounded-full shadow-sm">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal - shown for unauthenticated users or when manually opened */}
      <AuthModal
        isOpen={showAuthModal || (!user && !loading)}
        onClose={() => setShowAuthModal(false)}
      />

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
