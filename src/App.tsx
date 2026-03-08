import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Copy, Trash2, Check, Loader2, Clock, History, X, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { streamTranscription } from './lib/api';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';

interface Dictation {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
}

export default function App() {
  const { user, loading, signOut } = useAuth();
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('dictations');
    if (saved) {
      try {
        setDictations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse dictations", e);
      }
    }
  }, []);

  const saveDictation = (text: string, duration: number) => {
    if (!text.trim()) return;
    const newDictation: Dictation = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
      duration
    };
    const updated = [newDictation, ...dictations];
    setDictations(updated);
    localStorage.setItem('dictations', JSON.stringify(updated));
  };

  const deleteDictation = (id: string) => {
    const updated = dictations.filter(d => d.id !== id);
    setDictations(updated);
    localStorage.setItem('dictations', JSON.stringify(updated));
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
                ) : null}
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
                    className="w-16 h-16 flex items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-all active:scale-95 shadow-lg shadow-neutral-900/20 relative z-10"
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
                        <p className="text-neutral-900 font-medium truncate mb-1">
                          {d.text}
                        </p>
                        <div className="flex items-center text-xs text-neutral-500 space-x-3">
                          <span>{new Date(d.timestamp).toLocaleDateString()} {new Date(d.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span>•</span>
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatTime(d.duration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}
