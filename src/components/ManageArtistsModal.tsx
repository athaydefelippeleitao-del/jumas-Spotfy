import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Image as ImageIcon, User } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Artist {
  id: string;
  name: string;
  photoUrl?: string;
  biography?: string;
}

interface ManageArtistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  artists: Artist[];
  onUpdateArtists: (newArtists: Artist[]) => void;
  songs: any[];
  onUpdateSongs: (newSongs: any[]) => void;
}

export const ManageArtistsModal: React.FC<ManageArtistsModalProps> = ({
  isOpen,
  onClose,
  artists,
  onUpdateArtists,
  songs,
  onUpdateSongs
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [artistToDelete, setArtistToDelete] = useState<Artist | null>(null);
  
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [biography, setBiography] = useState('');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setPhotoUrl('');
    setBiography('');
    setError('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(t('common.imageSizeError'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('artists.nameRequired'));
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/artists/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, photoUrl, biography })
        });
        if (res.ok) {
          const updatedArtists = artists.map(a => 
            a.id === editingId ? { ...a, name: trimmedName, photoUrl, biography } : a
          );
          onUpdateArtists(updatedArtists);
        }
      } else {
        const res = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, photoUrl, biography })
        });
        if (res.ok) {
          const data = await res.json();
          onUpdateArtists([...artists, { ...data.artist, id: data.artist.id.toString() }]);
        }
      }
      resetForm();
    } catch (error) {
      setError(t('common.saveError'));
    }
  };

  const handleEdit = (artist: Artist) => {
    setName(artist.name);
    setPhotoUrl(artist.photoUrl || '');
    setBiography(artist.biography || '');
    setEditingId(artist.id);
    setIsAdding(true);
  };

  const handleDelete = async (artist: Artist) => {
    setArtistToDelete(artist);
  };

  const confirmDelete = async () => {
    if (!artistToDelete) return;
    const id = artistToDelete.id;
    try {
      const res = await fetch(`/api/artists/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onUpdateArtists(artists.filter(a => a.id !== id));
        // Remove artist from songs
        const updatedSongs = songs.map(s => s.artistId === id ? { ...s, artistId: null } : s);
        onUpdateSongs(updatedSongs);
      }
    } catch (error) {
      setError(t('common.deleteError'));
    } finally {
      setArtistToDelete(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-bg-elevated rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-elevated sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t('artists.manage')}</h2>
                <p className="text-xs text-text-secondary mt-1">{t('artists.manageDesc')}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {isAdding ? (
                <div className="space-y-4 bg-bg-secondary/30 p-4 rounded-2xl border border-border-color">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('artists.nameLabel')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-color rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-jumas-green/50 transition-all"
                      placeholder={t('artists.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('artists.photoLabel')}</label>
                    <div className="flex items-center gap-4">
                      {photoUrl ? (
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border-color">
                          <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setPhotoUrl('')}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <X size={16} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-bg-secondary border-2 border-dashed border-border-color flex items-center justify-center text-text-secondary">
                          <User size={24} />
                        </div>
                      )}
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-bg-elevated border border-border-color rounded-xl text-sm font-medium hover:bg-bg-secondary transition-colors flex items-center gap-2"
                      >
                        <ImageIcon size={16} />
                        {t('profile.chooseImage')}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{t('artists.bioLabel')}</label>
                    <textarea
                      value={biography}
                      onChange={(e) => setBiography(e.target.value)}
                      rows={4}
                      className="w-full bg-bg-elevated border border-border-color rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-jumas-green/50 transition-all resize-none"
                      placeholder={t('artists.bioPlaceholder')}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-2.5 bg-bg-elevated border border-border-color rounded-xl text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2.5 bg-jumas-green text-white rounded-xl text-sm font-bold hover:bg-jumas-green/90 transition-all shadow-md shadow-jumas-green/20"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="w-full mb-6 py-3 border-2 border-dashed border-border-color rounded-2xl text-text-secondary hover:text-jumas-green hover:border-jumas-green hover:bg-jumas-green/5 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus size={18} />
                    {t('artists.addNew')}
                  </button>

                  <div className="space-y-3">
                    {artists.length === 0 ? (
                      <div className="text-center py-8 text-text-secondary text-sm">
                        {t('artists.noneFound')}
                      </div>
                    ) : (
                      artists.map((artist, index) => (
                        <div 
                          key={`${artist.id}-${index}`}
                          className="flex items-center gap-4 p-3 bg-bg-secondary/50 rounded-2xl border border-border-color/50 group hover:border-jumas-green/30 transition-all"
                        >
                          {artist.photoUrl ? (
                            <img src={artist.photoUrl} alt={artist.name} className="w-12 h-12 rounded-full object-cover border border-border-color" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-bg-elevated border border-border-color flex items-center justify-center text-text-secondary">
                              <User size={20} />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-text-primary truncate">{artist.name}</h3>
                            {artist.biography && (
                              <p className="text-xs text-text-secondary truncate">{artist.biography}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(artist)}
                              className="p-2 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-xl transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(artist)}
                              className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                              title={t('common.delete')}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!artistToDelete}
        onClose={() => setArtistToDelete(null)}
        onConfirm={confirmDelete}
        title={t('artists.deleteTitle')}
        message={
          <p>
            {t('artists.deleteConfirm', { name: artistToDelete?.name })}
          </p>
        }
        confirmLabel={t('common.confirmDelete')}
      />
    </AnimatePresence>
  );
};
