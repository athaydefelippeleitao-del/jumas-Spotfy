import React, { useState } from 'react';
import * as ReactChords from '@tombatossals/react-chords/lib/Chord';

// Handle both ES module default exports and CommonJS exports
const Chord = (ReactChords as any).default || ReactChords;
import guitarDb from '@tombatossals/chords-db/lib/guitar.json';
import { ChevronLeft, ChevronRight, Guitar, Music, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChordDiagramsProps {
  chords: string[];
  highlightedChord?: string | null;
}

export const ChordDiagrams: React.FC<ChordDiagramsProps> = ({ chords, highlightedChord }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-show if a chord is highlighted
  React.useEffect(() => {
    if (highlightedChord) {
      setIsVisible(true);
    }
  }, [highlightedChord]);

  if (chords.length === 0) return null;

  const db = guitarDb;
  const instrumentData = {
    strings: 6,
    fretsOnChord: 4,
    name: 'Guitar',
    keys: [],
    tunings: {
      standard: ['E', 'A', 'D', 'G', 'B', 'E']
    }
  };

  const getChordData = (chordName: string) => {
    // Handle bass notes (e.g., C/G -> C)
    const baseChord = chordName.split('/')[0];
    
    // Basic normalization: C# -> Csharp, Bb -> Bflat
    let key = baseChord.charAt(0).toUpperCase();
    let suffix = baseChord.slice(1);
    
    // Handle sharps and flats
    if (suffix.startsWith('#')) {
      key += 'sharp';
      suffix = suffix.slice(1);
    } else if (suffix.startsWith('b')) {
      key += 'flat';
      suffix = suffix.slice(1);
    }

    // Map common suffixes to the ones in chords-db
    const suffixMap: Record<string, string> = {
      '': 'major',
      'm': 'minor',
      'M': 'major',
      'min': 'minor',
      'maj': 'major',
      '7': '7',
      'm7': 'm7',
      'M7': 'maj7',
      'maj7': 'maj7',
      '9': '9',
      'm9': 'm9',
      'add9': 'add9',
      'sus4': 'sus4',
      'sus2': 'sus2',
      '7sus4': '7sus4',
      'dim': 'dim',
      'dim7': 'dim7',
      'aug': 'aug',
      '6': '6',
      'm6': 'm6',
      '6/9': '69',
      '9sus4': '9sus4',
      '11': '11',
      '13': '13',
    };

    const chordKey = (db.chords as any)[key];
    if (!chordKey) return null;

    // Try exact match first
    let variation = chordKey.find((v: any) => v.suffix === suffix);
    if (variation) return variation.positions[0];

    // Try mapped suffix
    const mappedSuffix = suffixMap[suffix];
    if (mappedSuffix) {
      variation = chordKey.find((v: any) => v.suffix === mappedSuffix);
      if (variation) return variation.positions[0];
    }

    // Try minor mapping if it starts with m
    if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
      const minorSuffix = 'minor' + suffix.slice(1);
      variation = chordKey.find((v: any) => v.suffix === minorSuffix);
      if (variation) return variation.positions[0];
    }

    // Try major mapping if it's empty or starts with maj
    if (suffix === '' || suffix.startsWith('maj')) {
      const majorSuffix = 'major' + (suffix.startsWith('maj') ? suffix.slice(3) : '');
      variation = chordKey.find((v: any) => v.suffix === majorSuffix);
      if (variation) return variation.positions[0];
    }

    // Last resort: try to find any variation that starts with the suffix
    variation = chordKey.find((v: any) => v.suffix.startsWith(suffix) || suffix.startsWith(v.suffix));
    if (variation) return variation.positions[0];

    return null;
  };

  return (
    <div className="mt-4 mb-6">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#F27D26]/10 flex items-center justify-center text-[#F27D26]">
            <Music size={14} />
          </div>
          <h3 className="text-sm font-black text-text-primary tracking-tight">Diagramas de Acordes</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="text-xs font-bold text-text-secondary hover:text-[#F27D26] transition-colors uppercase tracking-widest"
          >
            {isVisible ? 'Esconder' : 'Mostrar'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex overflow-x-auto gap-2 p-2 bg-bg-primary rounded-xl border border-border-color shadow-inner custom-scrollbar items-start">
              {chords.map((chordName, index) => {
                const chordData = getChordData(chordName);
                if (!chordData) return null;

                return (
                  <div 
                    key={`${chordName}-${index}`} 
                    className={`flex-shrink-0 flex flex-col items-center bg-bg-secondary p-2 rounded-xl border transition-all duration-300 ${
                      highlightedChord === chordName 
                        ? 'border-[#F27D26] ring-2 ring-[#F27D26]/20 scale-105 shadow-lg z-10' 
                        : 'border-border-color shadow-sm hover:border-text-secondary hover:shadow-md'
                    }`}
                  >
                    <span className={`text-sm font-black mb-1 text-[#F27D26] tracking-tight`}>
                      {chordName}
                    </span>
                    <div className="w-16 h-20 flex items-center justify-center chord-diagram-container">
                      <Chord
                        chord={chordData}
                        instrument={instrumentData}
                        lite={true}
                      />
                    </div>
                  </div>
                );
              })}
              {chords.length > 0 && chords.every(c => !getChordData(c)) && (
                <p className="text-xs text-text-secondary italic w-full text-center py-4">
                  Diagramas não disponíveis para os acordes desta música.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .chord-diagram-container svg {
          width: 100%;
          height: 100%;
        }
        .chord-diagram-container svg text {
          font-family: inherit;
          font-weight: bold;
        }
        .chord-diagram-container svg text[fill="#ffffff"],
        .chord-diagram-container svg text[fill="white"] {
          font-size: 12px !important;
        }
        .dark .chord-diagram-container svg {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
    </div>
  );
};
