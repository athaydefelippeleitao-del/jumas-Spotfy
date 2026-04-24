import React, { useRef, useEffect } from 'react';
import { renderSongContent } from '../utils/chordParser';

interface ChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const ChordEditor: React.FC<ChordEditorProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  required = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Ensure scroll is synced when value changes (e.g., pasting large text)
  useEffect(() => {
    handleScroll();
  }, [value]);

  return (
    <div className={`relative w-full flex-1 min-h-[250px] font-mono text-sm ${className}`}>
      {/* Transparent Textarea for editing */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full font-mono text-sm bg-bg-secondary text-transparent placeholder:text-text-secondary caret-text-primary border border-border-color rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all custom-scrollbar resize-none whitespace-pre-wrap break-words"
        placeholder={placeholder}
        required={required}
        spellCheck={false}
      />

      {/* Overlay for syntax highlighting */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none font-mono text-sm whitespace-pre-wrap break-words px-4 py-3 border border-transparent custom-scrollbar overflow-hidden text-text-primary"
        aria-hidden="true"
      >
        {renderSongContent(value, true)}
        {/* Add an extra newline if the text ends with a newline to ensure the cursor can go to the next line properly */}
        {value.endsWith('\n') ? <br /> : null}
      </div>
    </div>
  );
};
