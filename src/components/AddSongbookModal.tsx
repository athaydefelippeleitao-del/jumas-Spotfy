import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, FileText, Trash2, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromPdf } from '../services/pdfService';
import { extractSongsFromText, ExtractedSong } from '../services/geminiService';
import { useTranslation } from 'react-i18next';

interface AddSongbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (songbook: { id: string; name: string; image?: string; pdfUrl?: string }, songs?: ExtractedSong[]) => void;
  editData?: { id: string; name: string; image?: string; pdfUrl?: string } | null;
}

export const AddSongbookModal: React.FC<AddSongbookModalProps> = ({ isOpen, onClose, onAdd, editData }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [pdfName, setPdfName] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSongs, setExtractedSongs] = useState<ExtractedSong[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setImage(editData.image);
      setPdfUrl(editData.pdfUrl);
      setPdfName(editData.pdfUrl ? 'Arquivo PDF anexado' : undefined);
      setExtractedSongs([]);
    } else {
      setName('');
      setImage(undefined);
      setPdfUrl(undefined);
      setPdfName(undefined);
      setExtractedSongs([]);
    }
    setIsSubmitting(false);
  }, [editData, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert(t('profile.error'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfUrl(reader.result as string);
        setPdfName(file.name);
        setExtractedSongs([]); // Reset extracted songs when PDF changes
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessPdf = async () => {
    if (!pdfUrl) return;
    
    setIsProcessing(true);
    try {
      const text = await extractTextFromPdf(pdfUrl);
      const songs = await extractSongsFromText(text);
      setExtractedSongs(songs);
      // alert(`${songs.length} músicas identificadas com sucesso!`);
    } catch (error: any) {
      alert(error.message || t('profile.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAdd({
        id: editData ? editData.id : Date.now().toString(),
        name: name.trim(),
        image: image,
        pdfUrl: pdfUrl
      }, extractedSongs);
      
      setName('');
      setImage(undefined);
      setPdfUrl(undefined);
      setPdfName(undefined);
      setExtractedSongs([]);
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-bg-elevated rounded-3xl shadow-2xl border border-border-color flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="p-4 sm:p-6 border-b border-border-color flex justify-between items-center bg-bg-secondary/50 shrink-0">
              <h2 className="text-xl font-bold text-text-primary">
                {editData ? t('songbook.editSongbookTitle') : t('songbook.newSongbookTitle')}
              </h2>
              <button 
                onClick={onClose} 
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-32 h-32 bg-bg-secondary rounded-2xl border-2 border-dashed border-border-color hover:border-jumas-green transition-all cursor-pointer overflow-hidden flex items-center justify-center group"
                >
                  {image ? (
                    <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center text-text-secondary group-hover:text-jumas-green">
                      <ImageIcon size={32} className="mb-1" />
                      <span className="text-xs font-medium">{t('songbook.addPhoto')}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Upload size={24} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                {image && (
                  <button 
                    type="button" 
                    onClick={() => setImage(undefined)}
                    className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    {t('songbook.removePhoto')}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.songbookName')}</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                  placeholder={t('songbook.placeholderSongbookName')} 
                  required 
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.attachPdf')}</label>
                <div 
                  onClick={() => pdfInputRef.current?.click()}
                  className={`w-full p-4 bg-bg-secondary border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center gap-3 ${pdfUrl ? 'border-jumas-green bg-jumas-green/5' : 'border-border-color hover:border-jumas-green'}`}
                >
                  <div className={`p-2 rounded-lg ${pdfUrl ? 'bg-jumas-green text-white' : 'bg-bg-elevated text-text-secondary'}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${pdfUrl ? 'text-jumas-green' : 'text-text-primary'}`}>
                      {pdfName || t('songbook.selectPdf')}
                    </p>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium">
                      {pdfUrl ? t('songbook.pdfAttached') : t('songbook.maxSize')}
                    </p>
                  </div>
                  {pdfUrl && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfUrl(undefined);
                        setPdfName(undefined);
                        setExtractedSongs([]);
                      }}
                      className="p-2 text-text-secondary hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={pdfInputRef} 
                  onChange={handlePdfChange} 
                  accept="application/pdf" 
                  className="hidden" 
                />
              </div>

              {pdfUrl && !editData && (
                <div className="bg-bg-secondary/50 rounded-xl p-4 border border-border-color">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-jumas-green/10 text-jumas-green rounded-lg">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-text-primary mb-1">{t('songbook.autoOrg')}</h4>
                      <p className="text-xs text-text-secondary mb-3">
                        {t('songbook.autoOrgDesc')}
                      </p>
                      <button
                        type="button"
                        onClick={handleProcessPdf}
                        disabled={isProcessing}
                        className="w-full py-2 bg-bg-elevated border border-border-color hover:border-jumas-green hover:text-jumas-green text-text-primary rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {t('songbook.processing')}
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            {extractedSongs.length > 0 ? t('songbook.redoImport', { count: extractedSongs.length }) : t('songbook.importSongsFromPdf')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border-color mt-2">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-5 py-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-jumas-green text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-md shadow-jumas-green/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {editData ? t('songbook.saving') : t('songbook.creating')}
                    </>
                  ) : (
                    editData ? t('common.save') : t('songbook.create')
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
