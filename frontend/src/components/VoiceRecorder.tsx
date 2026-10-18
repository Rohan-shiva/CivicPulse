import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RotateCcw, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { voiceApi } from '../services/api';

interface VoiceRecorderProps {
  onTranscriptsReady: (data: { nativeTranscript: string; englishTranslation: string; detectedLanguage: string }) => void;
  initialNative?: string;
  initialEnglish?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'unknown', label: 'Auto Detect Language' },
  { code: 'hi-IN', label: 'Hindi (हिंदी)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'en-IN', label: 'Indian English' },
];

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptsReady,
  initialNative = '',
  initialEnglish = '',
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('unknown');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [nativeText, setNativeText] = useState<string>(initialNative);
  const [englishText, setEnglishText] = useState<string>(initialEnglish);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer and object URLs on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine mimeType supported by browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setDurationSeconds(0);

      // 30 seconds timer
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError('Unable to access microphone. Please grant browser microphone permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationSeconds(0);
    setError(null);
    setSuccessMsg(null);
  };

  const processVoiceWithSarvam = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await voiceApi.processVoice(audioBlob, selectedLanguage);
      setNativeText(result.nativeTranscript);
      setEnglishText(result.englishTranslation);
      setSuccessMsg('Voice transcribed and translated into English successfully!');

      onTranscriptsReady({
        nativeTranscript: result.nativeTranscript,
        englishTranslation: result.englishTranslation,
        detectedLanguage: result.detectedLanguage,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Speech processing failed';
      setError(`Sarvam AI: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sync edits to parent
  const handleNativeChange = (val: string) => {
    setNativeText(val);
    onTranscriptsReady({
      nativeTranscript: val,
      englishTranslation: englishText,
      detectedLanguage: selectedLanguage,
    });
  };

  const handleEnglishChange = (val: string) => {
    setEnglishText(val);
    onTranscriptsReady({
      nativeTranscript: nativeText,
      englishTranslation: val,
      detectedLanguage: selectedLanguage,
    });
  };

  return (
    <div className="space-y-4 bg-white p-4 sm:p-5 rounded-lg border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h4 className="text-sm font-semibold text-civic-navy flex items-center">
            <Mic className="w-4 h-4 mr-1.5 text-civic-saffron" />
            Voice Complaint Description (Multilingual)
          </h4>
          <p className="text-xs text-slate-500">
            Speak in Hindi, Tamil, Telugu, Bengali, Kannada, or any Indian language (up to 30s)
          </p>
        </div>

        {/* Spoken Language Selector */}
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isRecording || isProcessing}
          className="text-xs border border-slate-300 rounded px-2.5 py-1 bg-slate-50 text-slate-700"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Recording Control Panel */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center px-4 py-2 bg-civic-saffron text-white text-xs font-semibold rounded-md shadow-xs hover:bg-orange-700 transition-colors"
          >
            <Mic className="w-4 h-4 mr-1.5" />
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-md shadow-xs hover:bg-rose-700 transition-colors animate-pulse"
          >
            <Square className="w-4 h-4 mr-1.5" />
            Stop Recording
          </button>
        )}

        {/* Timer indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono font-medium text-slate-700">
          <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`}></span>
          <span>{durationSeconds}s / 30s</span>
        </div>

        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2 ml-auto">
            <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-300 bg-white"
              title="Record again"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={processVoiceWithSarvam}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 bg-civic-navy text-white text-xs font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
              {isProcessing ? 'Processing AI...' : 'Transcribe & Translate'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start">
          <CheckCircle2 className="w-4 h-4 mr-1.5 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Editable Transcripts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Native Language Transcript (Editable)
          </label>
          <textarea
            rows={3}
            value={nativeText}
            onChange={(e) => handleNativeChange(e.target.value)}
            placeholder="Spoken words in your local language appear here..."
            className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-civic-blue focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Standardized English Description (Editable)
          </label>
          <textarea
            rows={3}
            value={englishText}
            onChange={(e) => handleEnglishChange(e.target.value)}
            placeholder="Official English translation appears here for municipal review..."
            className="w-full text-xs p-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-civic-blue focus:outline-hidden font-medium"
          />
        </div>
      </div>
    </div>
  );
};
