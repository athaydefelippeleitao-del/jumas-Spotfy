import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, AlertCircle, ChevronDown, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Stability settings ──────────────────────────────────────────────────────
// Must detect the SAME note for this many consecutive frames before showing it
const NOTE_LOCK_FRAMES = 18;
// Exponential smoothing factor for cents (0 = frozen, 1 = instant). Lower = smoother.
const CENTS_ALPHA = 0.08;
// Minimum RMS volume to process (ignore background noise)
const RMS_THRESHOLD = 0.035;
// Only push a UI update every N frames (reduces flickering)
const UI_UPDATE_EVERY = 5;
// ────────────────────────────────────────────────────────────────────────────

export const Tuner: React.FC = () => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cents, setCents] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedString, setSelectedString] = useState<number | null>(null);
  const [mode, setMode] = useState<'chromatic' | 'string-by-string'>('string-by-string');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stability state (all in refs so they don't cause re-renders inside the loop)
  const candidateNoteRef = useRef<string>('');
  const candidateCountRef = useRef<number>(0);
  const lockedNoteRef = useRef<string | null>(null);
  const smoothedCentsRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);

  const getTuningData = () => [
    { note: 'E2', name: t('tuner.notes.Mi'), freq: 82.41, string: 6 },
    { note: 'A2', name: t('tuner.notes.La'), freq: 110.00, string: 5 },
    { note: 'D3', name: t('tuner.notes.Re'), freq: 146.83, string: 4 },
    { note: 'G3', name: t('tuner.notes.Sol'), freq: 196.00, string: 3 },
    { note: 'B3', name: t('tuner.notes.Si'), freq: 246.94, string: 2 },
    { note: 'E4', name: t('tuner.notes.Mi'), freq: 329.63, string: 1 },
  ];

  const TUNING_DATA = getTuningData();

  // ── Audio helpers ──────────────────────────────────────────────────────────

  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const size = buffer.length;
    let rms = 0;
    for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / size);
    if (rms < RMS_THRESHOLD) return -1; // Too quiet → ignore

    let r1 = 0, r2 = size - 1;
    const thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
      if (Math.abs(buffer[size - i]) < thres) { r2 = size - i; break; }
    }

    const buf = buffer.slice(r1, r2);
    const len = buf.length;
    const c = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len - i; j++) c[i] += buf[j] * buf[j + i];
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < len; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }
    let T0 = maxpos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    return sampleRate / T0;
  };

  const getNoteFromFrequency = (freq: number) => {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const rounded = Math.round(noteNum) + 69;
    const noteName = NOTES[((rounded % 12) + 12) % 12];
    const exactFreq = 440 * Math.pow(2, (rounded - 69) / 12);
    const centsOff = Math.round(1200 * Math.log2(freq / exactFreq));
    return { noteName, centsOff };
  };

  // ── Main detection loop ────────────────────────────────────────────────────

  const updatePitch = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const detectedFreq = autoCorrelate(buffer, audioContextRef.current.sampleRate);

    if (detectedFreq !== -1) {
      const { noteName, centsOff } = getNoteFromFrequency(detectedFreq);

      // ── Note locking: only switch note after NOTE_LOCK_FRAMES confirmations ──
      if (noteName === candidateNoteRef.current) {
        candidateCountRef.current += 1;
      } else {
        candidateNoteRef.current = noteName;
        candidateCountRef.current = 1;
      }

      if (candidateCountRef.current >= NOTE_LOCK_FRAMES) {
        lockedNoteRef.current = noteName;
      }

      // ── Exponential smoothing on cents ──────────────────────────────────────
      if (lockedNoteRef.current !== null) {
        smoothedCentsRef.current =
          CENTS_ALPHA * centsOff + (1 - CENTS_ALPHA) * smoothedCentsRef.current;
      }

      // ── Push to UI only every UI_UPDATE_EVERY frames ────────────────────────
      frameCounterRef.current += 1;
      if (frameCounterRef.current >= UI_UPDATE_EVERY) {
        frameCounterRef.current = 0;
        if (lockedNoteRef.current !== null) {
          setNote(lockedNoteRef.current);
          setCents(Math.round(smoothedCentsRef.current));
          setPitch(detectedFreq);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(updatePitch);
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Reset stability state
      candidateNoteRef.current = '';
      candidateCountRef.current = 0;
      lockedNoteRef.current = null;
      smoothedCentsRef.current = 0;
      frameCounterRef.current = 0;

      setIsListening(true);
      setError(null);
      updatePitch();
    } catch (err: any) {
      if (err.name === 'NotFoundError') setError(t('tuner.noMic'));
      else if (err.name === 'NotAllowedError') setError(t('tuner.micDenied'));
      else setError(t('tuner.micError'));
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    lockedNoteRef.current = null;
    setIsListening(false);
    setPitch(null);
    setNote(null);
    setCents(0);
  };

  useEffect(() => () => stopListening(), []);

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const getTunerColor = () => {
    if (!isListening || !note) return 'text-text-secondary/50';
    if (Math.abs(cents) <= 8)  return 'text-jumas-green';
    if (Math.abs(cents) <= 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTuningInstruction = (): { text: string; sub: string; color: string } | null => {
    if (!isListening || !note) return null;
    const absCents = Math.abs(cents);
    if (absCents <= 8) return { text: '✓ Afinado!', sub: 'Perfeito', color: 'text-jumas-green' };

    const isTighten = cents < 0;
    const text = isTighten ? '↑ Apertar a corda' : '↓ Soltar a corda';
    let sub = '';

    if (absCents <= 20) {
      sub = isTighten ? 'Aperte só um pouquinho' : 'Solte só um pouquinho';
    } else if (absCents <= 40) {
      sub = isTighten ? 'Aperte um pouco mais' : 'Solte um pouco mais';
    } else {
      sub = isTighten ? 'Aperte bastante' : 'Solte bastante';
    }

    const color = absCents > 40 ? 'text-red-500' : absCents > 20 ? 'text-yellow-500' : 'text-yellow-400';

    return { text, sub, color };
  };

  const instruction = getTuningInstruction();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-transparent text-text-primary overflow-hidden relative font-sans">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary/50 backdrop-blur-md z-20 border-b border-border-color">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full transition-colors ${isListening ? 'bg-jumas-green/20 text-jumas-green' : 'bg-bg-elevated text-text-secondary'}`}>
            <Mic size={20} />
          </div>
          <button
            className="flex items-center gap-2 bg-bg-elevated hover:bg-bg-secondary px-4 py-2 rounded-xl transition-all text-text-primary"
            onClick={() => !isListening ? startListening() : stopListening()}
          >
            <span className="font-bold text-sm">{t('tuner.guitar')}</span>
            <ChevronDown size={16} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col items-center justify-between overflow-hidden py-6 md:py-8">

        {/* String lines background */}
        <div className="absolute inset-0 flex justify-center gap-6 sm:gap-8 md:gap-12 px-4 pointer-events-none">
          {TUNING_DATA.map((s, idx) => (
            <div
              key={idx}
              className={`w-[1px] h-full bg-gradient-to-b from-border-color via-border-color/50 to-transparent transition-all duration-500 ${selectedString === s.string ? 'opacity-100' : 'opacity-60'}`}
            >
              {selectedString === s.string && (
                <motion.div layoutId="string-glow" className="absolute inset-0 bg-jumas-green/20 blur-sm" />
              )}
            </div>
          ))}
        </div>

        {/* Note display */}
        <div className="flex-1 flex items-center justify-center relative z-10 w-full min-h-[150px]">
          <div className="text-center px-4">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 text-red-500 p-4 rounded-xl max-w-sm mx-auto border border-red-500/20"
                >
                  <p className="font-bold mb-1">{t('tuner.errorTitle')}</p>
                  <p className="text-sm">{error}</p>
                </motion.div>
              ) : isListening && note ? (
                <motion.div
                  key="note"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-2 md:space-y-4"
                >
                  {/* Large note name — uses layout animation so it doesn't "flash" on change */}
                  <motion.div
                    layout
                    className={`text-7xl md:text-8xl font-black tracking-tighter transition-colors duration-300 ${getTunerColor()}`}
                  >
                    {note}
                  </motion.div>
                  <div className="text-xs md:text-sm font-bold text-text-secondary uppercase tracking-[0.2em]">
                    {pitch?.toFixed(1)} Hz
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="prompt"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-base sm:text-lg md:text-xl text-text-secondary font-medium"
                >
                  {t('tuner.prompt')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom: Needle + Instruction + String Buttons */}
        <div className="w-full flex flex-col items-center gap-4 md:gap-6 relative z-20 pb-2 md:pb-6">

          {/* Tuning Meter */}
          <div className="w-full max-w-md relative flex flex-col items-center gap-2 px-6">

            {/* Tick marks + needle */}
            <div className="w-full h-12 relative flex items-center justify-center">
              <div className="absolute inset-0 flex justify-between items-end px-2">
                {[...Array(21)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-all ${
                      i === 10 ? 'h-8 bg-text-secondary' : i % 5 === 0 ? 'h-5 bg-border-color' : 'h-3 bg-border-color/50'
                    }`}
                  />
                ))}
              </div>

              {isListening && note && (
                <motion.div
                  animate={{ x: `${Math.max(-100, Math.min(100, (cents / 50) * 100))}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                  className={`absolute bottom-0 w-1.5 h-10 z-20 rounded-full transition-colors duration-500 shadow-lg ${
                    Math.abs(cents) <= 8 ? 'bg-jumas-green shadow-jumas-green/40'
                    : Math.abs(cents) <= 20 ? 'bg-yellow-400 shadow-yellow-400/40'
                    : Math.abs(cents) <= 40 ? 'bg-yellow-500 shadow-yellow-500/40'
                    : 'bg-red-500 shadow-red-500/40'
                  }`}
                />
              )}
            </div>

            {/* Fill bar showing deviation amount */}
            {isListening && note && Math.abs(cents) > 8 && (
              <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden relative">
                {/* center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-text-secondary/40" />
                <motion.div
                  animate={{
                    width: `${Math.min(50, Math.abs(cents / 50) * 50)}%`,
                    x: cents < 0 ? '-100%' : '0%',
                    left: cents < 0 ? '50%' : '50%',
                  }}
                  transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                  className={`absolute top-0 h-full rounded-full ${
                    Math.abs(cents) <= 20 ? 'bg-yellow-400'
                    : Math.abs(cents) <= 40 ? 'bg-yellow-500'
                    : 'bg-red-500'
                  }`}
                  style={{
                    left: '50%',
                    transform: cents < 0 ? 'translateX(-100%)' : 'translateX(0%)',
                    width: `${Math.min(50, (Math.abs(cents) / 50) * 50)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Tuning instruction */}
          <div className="min-h-[56px] flex flex-col items-center justify-center gap-0.5">
            <AnimatePresence mode="wait">
              {instruction && (
                <motion.div
                  key={instruction.text}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className={`text-lg font-black tracking-wide ${instruction.color}`}>
                    {instruction.text}
                  </span>
                  {instruction.sub && (
                    <span className={`text-xs font-semibold opacity-80 ${instruction.color}`}>
                      {instruction.sub}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* String Buttons */}
          <div className="flex justify-center gap-2 sm:gap-4 md:gap-6 px-2 w-full max-w-lg mx-auto">
            {TUNING_DATA.map((s) => (
              <div key={s.string} className="flex flex-col items-center gap-2 flex-1">
                <button
                  onClick={() => {
                    setSelectedString(s.string);
                    if (!isListening) startListening();
                  }}
                  className={`relative w-10 h-14 sm:w-12 sm:h-16 md:w-14 md:h-20 flex items-center justify-center transition-all duration-300 group ${
                    selectedString === s.string ? 'scale-110' : 'hover:scale-105'
                  }`}
                >
                  <div className={`absolute inset-0 rounded-full rounded-tl-none rotate-45 border-2 transition-all duration-300 ${
                    selectedString === s.string
                      ? 'bg-jumas-green/20 border-jumas-green shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                      : 'bg-bg-secondary border-border-color group-hover:border-text-secondary'
                  }`} />
                  <div className="relative z-10 flex flex-col items-center">
                    <span className={`text-xs sm:text-sm md:text-base font-black transition-colors ${selectedString === s.string ? 'text-jumas-green' : 'text-text-secondary'}`}>
                      {s.note[0]}<sub className="text-[9px] sm:text-[10px]">{s.note[1]}</sub>
                    </span>
                  </div>
                </button>
                <span className={`text-[10px] sm:text-xs font-bold transition-colors ${selectedString === s.string ? 'text-jumas-green' : 'text-text-secondary'}`}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-bg-secondary/50 border-t border-border-color px-4 py-3 flex items-center justify-around z-30">
        <button
          onClick={() => setMode('chromatic')}
          className={`flex flex-col items-center gap-1 transition-all ${mode === 'chromatic' ? 'text-jumas-green' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <Hash size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('tuner.chromatic')}</span>
        </button>
        <button
          onClick={() => setMode('string-by-string')}
          className={`flex flex-col items-center gap-1 transition-all relative ${mode === 'string-by-string' ? 'text-jumas-green' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-current rounded-full" />
            <div className="w-0.5 h-4 bg-current rounded-full" />
            <div className="w-0.5 h-4 bg-current rounded-full" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('tuner.stringByString')}</span>
          {mode === 'string-by-string' && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
              <div className="w-1 h-1 bg-jumas-green rounded-full" />
            </div>
          )}
        </button>
      </div>

      {error && (
        <div className="absolute top-24 left-4 right-4 z-50 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-medium backdrop-blur-md">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
};
