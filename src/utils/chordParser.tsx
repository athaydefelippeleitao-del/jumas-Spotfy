import React from 'react';

const renderTextWithBold = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

// Regex to detect inline chord definition lines like:
// "F#m:* x4420x"  or  "C#m: x-11-11-9-0-x"  or  "La:* x0x605"
const CUSTOM_CHORD_LINE_RE = /^([A-G][#b]?|Do|Ré?|Mi|Fá?|Sol|Lá?|Si)[^:\s]*:\*?\s+[x0-9][0-9x-]+$/i;

/**
 * Parses inline chord definitions from song content.
 * Supports formats like "F#m:* x4420x" and "C#m: x-11-11-9-0-x".
 * Returns a map of chordName -> fret array (6 values: -1 = muted, 0+ = fret).
 */
export const extractCustomChords = (content: string): Record<string, number[]> => {
  if (!content) return {};
  const result: Record<string, number[]> = {};
  for (const line of content.split('\n')) {
    const clean = line.replace(/<[^>]*>?/gm, '').trim();
    if (!CUSTOM_CHORD_LINE_RE.test(clean)) continue;
    const colonIdx = clean.indexOf(':');
    const chordName = clean.slice(0, colonIdx).trim();
    const rest = clean.slice(colonIdx + 1).replace(/^\*?\s*/, '').trim();
    // Parse positions: either compact "x4420x" or dash-separated "x-11-11-9-0-x"
    let positions: number[];
    if (rest.includes('-') && /[0-9]{2}/.test(rest)) {
      // Dash-separated (multi-digit frets)
      positions = rest.split('-').map(p => p === 'x' || p === 'X' ? -1 : parseInt(p, 10));
    } else {
      // Compact single-char per string
      positions = rest.split('').map(c => c === 'x' || c === 'X' ? -1 : parseInt(c, 10));
    }
    if (positions.length === 6) {
      result[chordName] = positions;
    }
  }
  return result;
};

export const renderSongContent = (content: string, isEditor: boolean = false, onChordClick?: (chord: string) => void) => {
  if (!content) return null;
  
  const chordClass = isEditor ? "text-[#F27D26]" : "text-[#F27D26] font-bold cursor-pointer hover:underline";

  const lines = content.split('\n');
  return lines.map((line, index) => {
    // Strip existing HTML tags just in case
    let cleanLine = line.replace(/<[^>]*>?/gm, '');
    const newline = index < lines.length - 1 ? '\n' : '';

    // Handle inline chord definition lines (e.g. "F#m:* x4420x")
    if (CUSTOM_CHORD_LINE_RE.test(cleanLine.trim())) {
      // Always show, both in editor and viewer
      return (
        <span key={index} className="text-text-secondary italic opacity-60 text-xs block mb-1">
          {line}{newline}
        </span>
      );
    }
    
    // Check for "Tom: G"
    const tomMatch = cleanLine.match(/^(Tom:\s*)(.*)$/i);
    if (tomMatch) {
      const tom = tomMatch[2].trim();
      return (
        <span key={index}>
          {tomMatch[1]}
          <span 
            className={chordClass}
            onClick={() => onChordClick && onChordClick(tom)}
          >
            {tomMatch[2]}
          </span>
          {newline}
        </span>
      );
    }

    // Check for sections like "[Intro] G C9"
    const sectionMatch = cleanLine.match(/^(\[.*?\]\s*)(.*)$/);
    if (sectionMatch) {
      const prefix = sectionMatch[1];
      const rest = sectionMatch[2];
      
      if (rest.trim() !== '') {
        const words = rest.split(/(\s+)/); // Keep spaces
        let isChordLine = true;
        let chordCount = 0;
        
        // Check if it's a chord line
        const testWords = rest.trim().split(/\s+/);
        for (const word of testWords) {
          if (word === '') continue;
          const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°)?[0-9]*M?(?:[+°])?(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/.test(word);
          if (isChord) {
            chordCount++;
          } else {
            if (!/^[\|\-\(\)x\.\,]+$/.test(word)) {
              isChordLine = false;
              break;
            }
          }
        }
        
        if (isChordLine && chordCount > 0) {
          return (
            <span key={index}>
              {prefix}
              {words.map((word, wIndex) => {
                const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°)?[0-9]*M?(?:[+°])?(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/.test(word);
                if (isChord) {
                  return (
                    <span 
                      key={wIndex} 
                      className={chordClass}
                      onClick={() => onChordClick && onChordClick(word)}
                    >
                      {word}
                    </span>
                  );
                }
                return <span key={wIndex}>{word}</span>;
              })}
              {newline}
            </span>
          );
        }
      }
      
      return <span key={index}>{renderTextWithBold(cleanLine)}{newline}</span>;
    }

    const words = cleanLine.split(/(\s+)/); // Keep spaces
    const testWords = cleanLine.trim().split(/\s+/);
    
    if (testWords.length === 0 || cleanLine.trim() === '') {
      return <span key={index}>{renderTextWithBold(cleanLine)}{newline}</span>;
    }
    
    let isChordLine = true;
    let chordCount = 0;
    
    for (const word of testWords) {
      if (word === '') continue;
      const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°)?[0-9]*M?(?:[+°])?(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/.test(word);
      if (isChord) {
        chordCount++;
      } else {
        if (!/^[\|\-\(\)x\.\,]+$/.test(word)) {
          isChordLine = false;
          break;
        }
      }
    }
    
    if (isChordLine && chordCount > 0) {
      return (
        <span key={index}>
          {words.map((word, wIndex) => {
            const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°)?[0-9]*M?(?:[+°])?(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/.test(word);
            if (isChord) {
              return (
                <span 
                  key={wIndex} 
                  className={chordClass}
                  onClick={() => onChordClick && onChordClick(word)}
                >
                  {word}
                </span>
              );
            }
            return <span key={wIndex}>{word}</span>;
          })}
          {newline}
        </span>
      );
    }
    
    return <span key={index}>{renderTextWithBold(cleanLine)}{newline}</span>;
  });
};

export const extractChords = (content: string): string[] => {
  if (!content) return [];
  
  const chords = new Set<string>();
  const lines = content.split('\n');
  
  lines.forEach(line => {
    let cleanLine = line.replace(/<[^>]*>?/gm, '');
    
    // Check for "Tom: G"
    const tomMatch = cleanLine.match(/^Tom:\s*(.*)$/i);
    if (tomMatch) {
      const tom = tomMatch[1].trim();
      if (tom) chords.add(tom);
      return;
    }

    // Check for sections like "[Intro] G C9"
    const sectionMatch = cleanLine.match(/^\[.*?\]\s*(.*)$/);
    let rest = cleanLine;
    if (sectionMatch) {
      rest = sectionMatch[1];
    }

    const words = rest.trim().split(/\s+/);
    let isChordLine = true;
    let lineChords: string[] = [];
    
    for (const word of words) {
      if (word === '') continue;
      const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°)?[0-9]*M?(?:[+°])?(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/.test(word);
      if (isChord) {
        lineChords.push(word);
      } else {
        if (!/^[\|\-\(\)x\.\,]+$/.test(word)) {
          isChordLine = false;
          break;
        }
      }
    }
    
    if (isChordLine && lineChords.length > 0) {
      lineChords.forEach(c => chords.add(c));
    }
  });
  
  return Array.from(chords);
};
