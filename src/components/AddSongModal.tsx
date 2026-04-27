import React, { useState, useEffect } from 'react';
import { X, Heart, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { renderSongContent } from '../utils/chordParser';
import { ChordEditor } from './ChordEditor';
import { useTranslation } from 'react-i18next';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (song: { 
    id?: string; 
    title: string; 
    category: string; 
    number: number; 
    content: string; 
    content_simplified?: string;
    content_lyrics?: string;
    songbookId: string; 
    isFavorite?: boolean; 
    artistId?: string; 
    artistIds?: string[];
    imageUrl?: string; 
    videoUrl?: string;
    videoUrls?: string[];
  }) => void;
  categories: string[];
  songbooks: { id: string; name: string }[];
  activeSongbookId: string;
  artists: { id: string; name: string }[];
  editData?: any;
}

export const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onAdd, categories, songbooks, activeSongbookId, artists, editData }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [number, setNumber] = useState('');
  const [content, setContent] = useState('');
  const [contentSimplified, setContentSimplified] = useState('');
  const [contentLyrics, setContentLyrics] = useState('');
  const [activeTab, setActiveTab] = useState<'principal' | 'simplified' | 'lyrics'>('principal');
  const [songbookId, setSongbookId] = useState(activeSongbookId);
  const [artistId, setArtistId] = useState('');
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const imageParts: any[] = [];
      
      // Read all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Set the first image as the song's photo
        if (i === 0) {
          setImageUrl(`data:${file.type};base64,${base64Data}`);
        }
        
        imageParts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY not found');
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        }
      });
      
      const prompt = "Extraia os detalhes da música destas imagens de uma cifra. Retorne um objeto JSON com as seguintes propriedades: 'title' (string, o título da música), 'artist' (string, o nome do artista, opcional), 'content' (string, a letra com os acordes acima dela). Formate o conteúdo (content) APENAS EM TEXTO PLANO (sem tags HTML). É CRÍTICO que você mantenha RIGOROSAMENTE o alinhamento original dos acordes com a letra usando espaços em branco. Coloque os acordes exatamente acima das sílabas correspondentes. NÃO use nenhuma tag HTML como <span> ou <b>. O sistema irá colorir os acordes automaticamente depois.";

      const result = await model.generateContent([
        ...imageParts,
        { text: prompt }
      ]);
      const response = await result.response;
      const textResponse = response.text();

      if (textResponse) {
        const data = JSON.parse(textResponse);
        if (data.title) setTitle(data.title);
        
        // Append content if there's already some content, otherwise set it
        if (data.content) {
          if (activeTab === 'principal') {
            setContent(prev => prev ? prev + '\n\n' + data.content : data.content);
          } else if (activeTab === 'simplified') {
            setContentSimplified(prev => prev ? prev + '\n\n' + data.content : data.content);
          } else {
            setContentLyrics(prev => prev ? prev + '\n\n' + data.content : data.content);
          }
        }
        
        // Try to match artist if provided
        if (data.artist && artists.length > 0) {
          const matchedArtist = artists.find(a => a.name.toLowerCase().includes(data.artist.toLowerCase()) || data.artist.toLowerCase().includes(a.name.toLowerCase()));
          if (matchedArtist) {
            setArtistId(matchedArtist.id);
            if (!artistIds.includes(matchedArtist.id)) {
              setArtistIds([...artistIds, matchedArtist.id]);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing images with AI:", error);
      alert(t('profile.error'));
    } finally {
      setIsScanning(false);
      // Reset the file input so the same files can be selected again if needed
      e.target.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTitle(editData.title || '');
        setCategory(editData.category || '');
        setNumber(editData.number?.toString() || '');
        setContent(editData.content || '');
        setContentSimplified(editData.content_simplified || '');
        setContentLyrics(editData.content_lyrics || '');
        setSongbookId(editData.songbookId || activeSongbookId);
        setArtistId(editData.artistId || '');
        setArtistIds(editData.artistIds || (editData.artistId ? [editData.artistId] : []));
        setIsFavorite(editData.isFavorite || false);
        setImageUrl(editData.imageUrl || '');
        setVideoUrl('');
        setVideoUrls(editData.videoUrls || (editData.videoUrl ? [editData.videoUrl] : []));
      } else {
        if (categories.length > 0 && !category) {
          setCategory(categories[0]);
        }
        if (activeSongbookId) {
          setSongbookId(activeSongbookId);
        }
        setTitle('');
        setNumber('');
        setContent('');
        setContentSimplified('');
        setContentLyrics('');
        setNewCategory('');
        setArtistId('');
        setArtistIds([]);
        setIsFavorite(false);
        setImageUrl('');
        setVideoUrl('');
        setVideoUrls([]);
      }
    }
  }, [isOpen, categories, category, activeSongbookId, editData]);

  const handleAddVideoUrl = () => {
    if (videoUrl && !videoUrls.includes(videoUrl)) {
      setVideoUrls([...videoUrls, videoUrl]);
      setVideoUrl('');
    }
  };

  const handleRemoveVideoUrl = (urlToRemove: string) => {
    setVideoUrls(videoUrls.filter(url => url !== urlToRemove));
  };

  const handleAddArtist = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id && !artistIds.includes(id)) {
      setArtistIds([...artistIds, id]);
    }
    e.target.value = '';
  };

  const handleRemoveArtist = (idToRemove: string) => {
    setArtistIds(artistIds.filter(id => id !== idToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === 'new' ? newCategory : category;
    
    if (!title || !finalCategory || !number || !content || !songbookId) {
      alert(t('common.requiredField'));
      return;
    }

    onAdd({
      id: editData?.id,
      title,
      category: finalCategory,
      number: parseInt(number, 10),
      content,
      content_simplified: contentSimplified || null,
      content_lyrics: contentLyrics || null,
      songbookId,
      isFavorite,
      artistId: artistIds.length > 0 ? artistIds[0] : null,
      artistIds: artistIds.length > 0 ? artistIds : undefined,
      imageUrl: imageUrl || null,
      videoUrl: videoUrls.length > 0 ? videoUrls[0] : null,
      videoUrls: videoUrls.length > 0 ? videoUrls : undefined
    });

    // Reset form
    setTitle('');
    setNumber('');
    setContent('');
    setContentSimplified('');
    setContentLyrics('');
    setCategory(categories[0] || '');
    setNewCategory('');
    setArtistId('');
    setArtistIds([]);
    setIsFavorite(false);
    setImageUrl('');
    setVideoUrl('');
    setVideoUrls([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
            className="relative w-full max-w-3xl bg-bg-elevated rounded-3xl shadow-2xl border border-border-color flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-border-color flex justify-between items-center bg-bg-secondary/50">
              <h2 className="text-xl font-bold text-text-primary">{editData ? t('songbook.editChord') : t('songbook.addSong')}</h2>
              <button 
                onClick={onClose} 
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar">
              <div className="w-full">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageScan}
                  className="hidden"
                  id="image-scan-input"
                />
                <label
                  htmlFor="image-scan-input"
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer border-2 border-dashed ${
                    isScanning
                      ? 'bg-bg-secondary border-border-color text-text-secondary cursor-not-allowed'
                      : 'bg-jumas-green/5 border-jumas-green/30 text-jumas-green hover:bg-jumas-green/10 hover:border-jumas-green/50'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {t('songbook.analyzingImage')}
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      {t('songbook.scanWithAI')}
                    </>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.songbook')}</label>
                  <select 
                    value={songbookId} 
                    onChange={e => setSongbookId(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                    required
                  >
                    {songbooks.map((sb, index) => <option key={`${sb.id}-${index}`} value={sb.id}>{sb.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.category')}</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                  >
                    {categories.map((c, index) => <option key={`${c}-${index}`} value={c}>{c}</option>)}
                    <option value="new">+ {t('songbook.newCategory')}</option>
                  </select>
                </div>
              </div>

              {category === 'new' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.newCategory')}</label>
                  <input 
                    type="text" 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder={t('songbook.placeholderCategory')} 
                    required={category === 'new'} 
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.songTitle')}</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder={t('songbook.placeholderTitle')} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.songbookNumber')}</label>
                  <input 
                    type="number" 
                    value={number} 
                    onChange={e => setNumber(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder={t('songbook.placeholderNumber')} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.artistOptional')}</label>
                <select 
                  onChange={handleAddArtist} 
                  className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                  defaultValue=""
                >
                  <option value="" disabled>{t('songbook.noArtistSelected') || 'Selecione um artista'}</option>
                  {artists.map((a, index) => <option key={`${a.id}-${index}`} value={a.id}>{a.name}</option>)}
                </select>
                
                {artistIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {artistIds.map((id, index) => {
                      const artist = artists.find(a => a.id === id);
                      if (!artist) return null;
                      return (
                        <div key={index} className="flex items-center gap-2 bg-jumas-green/10 border border-jumas-green/30 text-jumas-green px-3 py-1.5 rounded-lg text-xs font-medium">
                          <span className="max-w-[200px] truncate">{artist.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveArtist(id)}
                            className="hover:text-red-500 transition-colors ml-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isFavorite ? 'bg-red-50 text-red-500 border-red-200' : 'bg-bg-secondary text-text-secondary border-border-color hover:border-red-200 hover:text-red-500'}`}
                >
                  <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                  <span className="text-sm font-bold">{isFavorite ? t('songbook.isFavorite') : t('songbook.markAsFavorite')}</span>
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.musicLinks')}</label>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={videoUrl} 
                    onChange={e => setVideoUrl(e.target.value)} 
                    className="flex-1 bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder={t('songbook.placeholderYoutube')} 
                  />
                  <button
                    type="button"
                    onClick={handleAddVideoUrl}
                    className="px-4 py-2 bg-jumas-green text-white rounded-xl hover:bg-green-700 transition-colors font-bold"
                  >
                    {t('common.confirm')}
                  </button>
                </div>
                
                {videoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {videoUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 bg-bg-secondary border border-border-color px-3 py-1.5 rounded-lg text-xs">
                        <span className="max-w-[200px] truncate text-text-primary">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideoUrl(url)}
                          className="text-text-secondary hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.songPhotoOptional')}</label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-color">
                      <img src={imageUrl} alt="Cifra preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="song-image-upload"
                    />
                    <label
                      htmlFor="song-image-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border-color rounded-xl text-text-secondary hover:text-jumas-green hover:border-jumas-green/50 hover:bg-jumas-green/5 transition-all cursor-pointer"
                    >
                      <ImageIcon size={20} />
                      {imageUrl ? t('songbook.changePhoto') : t('songbook.addPhoto')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[350px] relative">
                <div className="flex items-center gap-2 mb-3 bg-bg-secondary p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveTab('principal')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'principal' ? 'bg-bg-elevated text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {t('songbook.tabPrincipal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('simplified')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'simplified' ? 'bg-bg-elevated text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {t('songbook.tabSimplified')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('lyrics')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'lyrics' ? 'bg-bg-elevated text-jumas-green shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {t('songbook.tabLyrics')}
                  </button>
                </div>

                {activeTab === 'principal' && (
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.principalChord')}</label>
                    <ChordEditor
                      value={content}
                      onChange={setContent}
                      placeholder={t('songbook.placeholderPrincipal')}
                      required
                    />
                  </div>
                )}

                {activeTab === 'simplified' && (
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.simplifiedChordOptional')}</label>
                    <ChordEditor
                      value={contentSimplified}
                      onChange={setContentSimplified}
                      placeholder={t('songbook.placeholderSimplified')}
                    />
                  </div>
                )}

                {activeTab === 'lyrics' && (
                  <div className="flex-1 flex flex-col">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('songbook.lyricsOptional')}</label>
                    <textarea
                      value={contentLyrics}
                      onChange={e => setContentLyrics(e.target.value)}
                      placeholder={t('songbook.placeholderLyrics')}
                      className="flex-1 w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all font-mono resize-none"
                    />
                  </div>
                )}
              </div>

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
                  className="px-6 py-2.5 bg-jumas-green text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-md shadow-jumas-green/20"
                >
                  {editData ? t('profile.save') : t('songbook.saveSong')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
