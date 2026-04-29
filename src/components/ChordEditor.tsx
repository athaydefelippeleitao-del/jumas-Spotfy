import React, { useRef, useEffect } from 'react';
import { renderSongContent } from '../utils/chordParser';
import { Bold } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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

  const handleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      // Check if already bold (wrapped in **)
      const beforeStart = value.substring(Math.max(0, start - 2), start);
      const afterEnd = value.substring(end, Math.min(value.length, end + 2));
      
      if (beforeStart === '**' && afterEnd === '**') {
        // Remove bold
        const newValue = value.substring(0, start - 2) + selectedText + value.substring(end + 2);
        onChange(newValue);
        // Restore selection without the **
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - 2, end - 2);
        }, 0);
      } else {
        // Add bold
        const newValue = value.substring(0, start) + '**' + selectedText + '**' + value.substring(end);
        onChange(newValue);
        // Keep the text selected (accounting for the added **)
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 2, end + 2);
        }, 0);
      }
    } else {
      // No selection: insert ** cursor **
      const newValue = value.substring(0, start) + '****' + value.substring(end);
      onChange(newValue);
      // Place cursor between the **
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  return (
    <div className={`relative w-full flex-1 min-h-[250px] flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-1.5 bg-bg-secondary/50 rounded-xl px-2 py-1 border border-border-color/50 w-fit">
        <button
          type="button"
          onClick={handleBold}
          className="p-1.5 rounded-lg text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 transition-all flex items-center gap-1.5"
          title={t('songbook.boldButton') || 'Negrito (selecione o texto)'}
        >
          <Bold size={16} strokeWidth={3} />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Negrito</span>
        </button>
      </div>

      {/* Editor area */}
      <div className="relative w-full flex-1 min-h-[220px] font-mono text-sm">
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
    </div>
  );
};
