import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Play, FileText, Trash2, Edit2, ChevronLeft, ChevronRight, X, BookOpen, Camera, Image as ImageIcon, Video, Upload, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ChordEditor } from './ChordEditor';
import { DeleteAcademyItemConfirmModal } from './DeleteAcademyItemConfirmModal';
import { useTranslation } from 'react-i18next';

// ─── Video helpers ────────────────────────────────────────────────────────────
type VideoKind = 'youtube' | 'vimeo' | 'direct' | 'base64' | 'none';

function detectVideoKind(url?: string): VideoKind {
  if (!url) return 'none';
  if (url.startsWith('data:video/')) return 'base64';
  if (/youtu\.be\/|youtube\.com\/(watch|embed|shorts)/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return 'direct';
  // Google Drive share links
  if (/drive\.google\.com\/file\/d\/([^/]+)/i.test(url)) return 'direct';
  return 'none';
}

function toEmbedUrl(url: string, kind: VideoKind): string {
  if (kind === 'youtube') {
    const ytId =
      url.match(/youtu\.be\/([^?]+)/)?.[1] ||
      url.match(/[?&]v=([^&]+)/)?.[1] ||
      url.match(/\/shorts\/([^?]+)/)?.[1] ||
      url.match(/\/embed\/([^?]+)/)?.[1];
    return ytId ? `https://www.youtube.com/embed/${ytId}?rel=0` : url;
  }
  if (kind === 'vimeo') {
    const vId = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)?.[1];
    return vId ? `https://player.vimeo.com/video/${vId}` : url;
  }
  // Google Drive: convert share URL to preview
  const driveId = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1];
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return url;
}

interface VideoPlayerProps { url: string; title: string; }
const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const kind = detectVideoKind(url);
  if (kind === 'none') return null;
  if (kind === 'base64' || kind === 'direct') {
    return (
      <video
        src={url}
        controls
        className="w-full h-full rounded-3xl"
        title={title}
        playsInline
      />
    );
  }
  return (
    <iframe
      src={toEmbedUrl(url, kind)}
      className="w-full h-full"
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      title={title}
    />
  );
};

interface AcademyItem {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  content?: string;
  type: 'tutorial' | 'cifra';
  createdAt: string;
}

export const AcademyView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [videoTab, setVideoTab] = useState<'link' | 'upload'>('link');
  const [videoUploadName, setVideoUploadName] = useState('');

  const [items, setItems] = useState<AcademyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AcademyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademyItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, title: string} | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    content: '',
    type: 'tutorial' as 'tutorial' | 'cifra'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/academy');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch academy items', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(t('academy.uploadLimit'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, content: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_MB = 100;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`O vídeo deve ter no máximo ${MAX_MB}MB.`);
      return;
    }
    setVideoUploadName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, videoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem ? 'PATCH' : 'POST';
    const url = editingItem ? `/api/academy/${editingItem.id}` : '/api/academy';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        fetchItems();
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ title: '', description: '', videoUrl: '', content: '', type: 'tutorial' });
      }
    } catch (error) {
      console.error('Failed to save academy item', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/academy/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchItems();
        if (selectedItem?.id === id) setSelectedItem(null);
      }
    } catch (error) {
      console.error('Failed to delete academy item', error);
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isBase64Image = (str: string) => str.startsWith('data:image/');

  const renderContent = (content: string) => {
    if (!content) return null;
    
    if (isBase64Image(content)) {
      return (
        <div className="flex flex-col items-center">
          <img 
            src={content} 
            alt="Cifra" 
            className="max-w-full rounded-2xl shadow-lg border border-border-color" 
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    const lines = content.split('\n');
    return lines.map((line, index) => {
      let cleanLine = line.replace(/<[^>]*>?/gm, '');
      
      const tomMatch = cleanLine.match(/^(Tom:\s*)(.*)$/i);
      if (tomMatch) {
        return (
          <div key={index} className="whitespace-pre">
            {tomMatch[1]}
            <span className="text-[#ff7f00] font-bold">{tomMatch[2]}</span>
          </div>
        );
      }

      const sectionMatch = cleanLine.match(/^(\[.*?\]\s*)(.*)$/);
      if (sectionMatch) {
        const prefix = sectionMatch[1];
        const rest = sectionMatch[2];
        
        if (rest.trim() !== '') {
          const words = rest.trim().split(/\s+/);
          let isChordLine = true;
          let chordCount = 0;
          
          for (const word of words) {
            if (word === '') continue;
            const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/i.test(word);
            if (isChord) {
              chordCount++;
            } else {
              if (!/^[\|\-\(\)x\.\,\s]+$/.test(word)) {
                isChordLine = false;
                break;
              }
            }
          }
          
          if (isChordLine && chordCount > 0) {
            return (
              <div key={index} className="whitespace-pre">
                {prefix}
                <span className="text-[#ff7f00] font-bold">{rest}</span>
              </div>
            );
          }
        }
        
        return <div key={index} className="whitespace-pre">{cleanLine || '\u00A0'}</div>;
      }

      const words = cleanLine.trim().split(/\s+/);
      if (words.length === 0 || cleanLine.trim() === '') {
        return <div key={index} className="whitespace-pre">{cleanLine || '\u00A0'}</div>;
      }
      
      let isChordLine = true;
      let chordCount = 0;
      
      for (const word of words) {
        if (word === '') continue;
        const isChord = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(?:\([^)]+\))?(?:\/[A-G][#b]?)?$/i.test(word);
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
        return <div key={index} className="text-[#ff7f00] font-bold whitespace-pre">{cleanLine}</div>;
      }
      
      return <div key={index} className="whitespace-pre">{cleanLine || '\u00A0'}</div>;
    });
  };

  if (selectedItem) {
    return (
      <div className="flex-1 flex flex-col bg-bg-primary">
        <div className="p-4 border-b border-border-color flex items-center gap-4 sticky top-0 bg-bg-primary/80 backdrop-blur-md z-10">
          <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-bg-secondary rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-black tracking-tight flex-1 truncate">{selectedItem.title}</h2>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingItem(selectedItem);
                  setFormData({
                    title: selectedItem.title,
                    description: selectedItem.description,
                    videoUrl: selectedItem.videoUrl || '',
                    content: selectedItem.content || '',
                    type: selectedItem.type
                  });
                  setIsModalOpen(true);
                }}
                className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => setItemToDelete({ id: selectedItem.id, title: selectedItem.title })}
                className="p-2 hover:bg-bg-secondary rounded-full text-red-500"
              >
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedItem.videoUrl && detectVideoKind(selectedItem.videoUrl) !== 'none' && (
            <div className="mb-8 aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl">
              <VideoPlayer url={selectedItem.videoUrl} title={selectedItem.title} />
            </div>
          )}

          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-text-secondary mb-8 leading-relaxed">
              {selectedItem.description}
            </p>

            {selectedItem.content && (
              <div className={`rounded-3xl p-4 sm:p-8 overflow-x-auto ${isBase64Image(selectedItem.content) ? '' : 'bg-bg-secondary/50 border border-border-color shadow-inner font-mono text-sm sm:text-base'}`}>
                {renderContent(selectedItem.content)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-primary">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-text-primary">{t('academy.title')}</h1>
            <p className="text-text-secondary font-medium">{t('academy.subtitle')}</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setFormData({ title: '', description: '', videoUrl: '', content: '', type: 'tutorial' });
                setIsModalOpen(true);
              }}
              className="w-12 h-12 bg-jumas-green text-white rounded-2xl flex items-center justify-center shadow-lg shadow-jumas-green/20 hover:scale-105 transition-transform"
            >
              <Plus size={24} />
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
          <input 
            type="text"
            placeholder={t('academy.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-border-color rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-jumas-green/20 border-t-jumas-green rounded-full animate-spin" />
            <p className="text-text-secondary font-bold animate-pulse">{t('academy.loading')}</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                layoutId={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-bg-secondary/50 border border-border-color rounded-[2rem] p-6 hover:bg-bg-secondary transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {item.type === 'tutorial' ? <Play size={48} /> : <FileText size={48} />}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'tutorial' ? 'bg-blue-500/10 text-blue-500' : 'bg-jumas-green/10 text-jumas-green'}`}>
                    {item.type === 'tutorial' ? <Play size={20} /> : <FileText size={20} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    {item.type === 'tutorial' ? t('academy.tutorial') : t('academy.chord')}
                  </span>
                </div>

                <h3 className="text-xl font-black tracking-tight text-text-primary mb-2 group-hover:text-jumas-green transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-secondary/50">
                    {new Date(item.createdAt).toLocaleDateString(i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : i18n.language)}
                  </span>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({ id: item.id, title: item.title });
                        }}
                        className="w-8 h-8 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary hover:bg-red-500 hover:text-white transition-all"
                        title={t('common.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-bg-primary flex items-center justify-center group-hover:bg-jumas-green group-hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-bg-secondary/30 rounded-[3rem] border border-dashed border-border-color">
            <BookOpen size={48} className="mx-auto text-text-secondary/20 mb-4" />
            <h3 className="text-xl font-bold text-text-primary">{t('academy.noItemsFound')}</h3>
            <p className="text-text-secondary">{t('academy.noItemsDesc')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-bg-elevated rounded-[2.5rem] shadow-2xl border border-border-color overflow-hidden"
            >
              <div className="p-8 border-b border-border-color flex items-center justify-between bg-bg-secondary/50">
                <h2 className="text-2xl font-black tracking-tight text-text-primary">
                  {editingItem ? t('academy.editItem') : t('academy.newItem')}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-bg-secondary rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4 p-1 bg-bg-secondary rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'tutorial' }))}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'tutorial' ? 'bg-bg-primary text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {t('academy.tutorial')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'cifra' }))}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'cifra' ? 'bg-bg-primary text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {t('academy.chord')}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-2">{t('academy.titleLabel')}</label>
                    <input 
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-bg-secondary border border-border-color rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all"
                      placeholder={t('academy.titlePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-2">{t('academy.descriptionLabel')}</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-bg-secondary border border-border-color rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all min-h-[100px]"
                      placeholder={t('academy.descriptionPlaceholder')}
                    />
                  </div>

                  {formData.type === 'tutorial' ? (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1 ml-2">Vídeo do Tutorial</label>
                      {/* Tab selector */}
                      <div className="grid grid-cols-2 gap-2 p-1 bg-bg-secondary rounded-xl">
                        <button type="button" onClick={() => setVideoTab('link')}
                          className={`py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            videoTab === 'link' ? 'bg-bg-primary text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'
                          }`}>
                          <LinkIcon size={13} /> Link
                        </button>
                        <button type="button" onClick={() => setVideoTab('upload')}
                          className={`py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                            videoTab === 'upload' ? 'bg-bg-primary text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'
                          }`}>
                          <Upload size={13} /> Enviar arquivo
                        </button>
                      </div>

                      {videoTab === 'link' ? (
                        <div>
                          <input
                            type="url"
                            value={formData.videoUrl.startsWith('data:') ? '' : formData.videoUrl}
                            onChange={e => { setVideoUploadName(''); setFormData(prev => ({ ...prev, videoUrl: e.target.value })); }}
                            className="w-full bg-bg-secondary border border-border-color rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all"
                            placeholder="YouTube, Vimeo, Google Drive ou link direto (.mp4)"
                          />
                          <p className="text-[10px] text-text-secondary/60 mt-1 ml-2">Suporta YouTube, Vimeo, Google Drive e links .mp4</p>
                        </div>
                      ) : (
                        <div
                          onClick={() => videoFileInputRef.current?.click()}
                          className="w-full rounded-2xl bg-bg-secondary border-2 border-dashed border-border-color hover:border-jumas-green transition-all cursor-pointer flex flex-col items-center justify-center py-8 gap-3"
                        >
                          {videoUploadName || formData.videoUrl.startsWith('data:video/') ? (
                            <>
                              <Video size={36} className="text-jumas-green" />
                              <p className="text-sm font-bold text-text-primary">{videoUploadName || 'Vídeo carregado'}</p>
                              <p className="text-[10px] text-text-secondary">Clique para trocar</p>
                            </>
                          ) : (
                            <>
                              <Upload size={36} className="text-text-secondary" />
                              <p className="text-sm font-bold text-text-primary">Clique para enviar um vídeo</p>
                              <p className="text-[10px] text-text-secondary">MP4, WebM ou OGG — máx. 100 MB</p>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        type="file"
                        ref={videoFileInputRef}
                        onChange={handleVideoUpload}
                        accept="video/mp4,video/webm,video/ogg"
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-2">{t('academy.chordImageLabel')}</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-video bg-bg-secondary border-2 border-dashed border-border-color rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-jumas-green transition-all overflow-hidden relative group"
                      >
                        {formData.content && isBase64Image(formData.content) ? (
                          <>
                            <img src={formData.content} className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                              {t('academy.changeImage')}
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera size={40} className="text-text-secondary mb-2" />
                            <span className="text-sm text-text-secondary font-bold">{t('academy.uploadClick')}</span>
                            <span className="text-[10px] text-text-secondary/50 mt-1">{t('academy.uploadLimit')}</span>
                          </>
                        )}
                      </div>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                          type="text"
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder={t('academy.imageUrlPlaceholder')}
                          className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === 'tutorial' && (
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-2">{t('academy.extraContentLabel')}</label>
                      <ChordEditor
                        value={formData.content}
                        onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
                        placeholder={t('academy.extraContentPlaceholder')}
                        className="min-h-[150px]"
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-jumas-green text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-jumas-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingItem ? t('academy.saveChanges') : t('academy.publish')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteAcademyItemConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDelete(itemToDelete.id)}
        itemTitle={itemToDelete?.title || ''}
      />
    </div>
  );
};
