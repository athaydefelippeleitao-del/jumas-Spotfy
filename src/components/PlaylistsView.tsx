import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Share2, X, Music, Calendar, GripVertical, ListMusic, History, Heart, MoreVertical, Download, ChevronLeft } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { SongCover } from './SongCover';
import { useTranslation } from 'react-i18next';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  date?: string;
  shareId: string;
}

interface PlaylistsViewProps {
  onSelectPlaylist: (id: string | null) => void;
  onSelectSong: (id: string) => void;
  selectedPlaylistId: string | null;
  songs: any[];
  artists: any[];
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onSelectPlaylist, onSelectSong, selectedPlaylistId, songs, artists, playlists, setPlaylists }) => {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistDate, setNewPlaylistDate] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Created'>('All');
  
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [songToRemove, setSongToRemove] = useState<{ id: string, title: string } | null>(null);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName) return;

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDesc,
          date: newPlaylistDate || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => [{...data.playlist, id: data.playlist.id.toString()}, ...prev]);
        setIsCreateModalOpen(false);
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        setNewPlaylistDate('');
      }
    } catch (error) {
      console.error('Failed to create playlist', error);
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylistToDelete(playlist);
  };

  const confirmDeletePlaylist = async () => {
    if (!playlistToDelete) return;
    const id = playlistToDelete.id;
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        if (selectedPlaylistId === id) {
          onSelectPlaylist('');
        }
      }
    } catch (error) {
      console.error('Failed to delete playlist', error);
    } finally {
      setPlaylistToDelete(null);
    }
  };

  const [isSearchingToAdd, setIsSearchingToAdd] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  useEffect(() => {
    if (selectedPlaylistId && selectedPlaylistId !== 'recentes' && selectedPlaylistId !== 'favoritas') {
      const fetchPlaylistSongs = async () => {
        setIsLoadingSongs(true);
        try {
          const res = await fetch(`/api/playlists/${selectedPlaylistId}`);
          if (res.ok) {
            const data = await res.json();
            setPlaylistSongs(data.songs.map((s: any) => ({ ...s, id: s.id.toString() })));
          }
        } catch (error) {
          console.error('Failed to fetch playlist songs', error);
        } finally {
          setIsLoadingSongs(false);
        }
      };
      fetchPlaylistSongs();
    } else if (selectedPlaylistId === 'recentes') {
      const recentIds = JSON.parse(localStorage.getItem('recentSongIds') || '[]');
      const uniqueRecentIds = Array.from(new Set(recentIds)) as string[];
      setPlaylistSongs(uniqueRecentIds.map((id: string) => songs.find(s => s.id === id)).filter(Boolean));
    } else if (selectedPlaylistId === 'favoritas') {
      setPlaylistSongs(songs.filter(s => s.isFavorite));
    } else {
      setPlaylistSongs([]);
    }
  }, [selectedPlaylistId, songs]);

  const handleAddSongToPlaylist = async (songId: string) => {
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });

      if (res.ok) {
        // Refresh playlist songs
        const songToAdd = songs.find(s => s.id === songId);
        if (songToAdd && !playlistSongs.find(s => s.id === songId)) {
          setPlaylistSongs(prev => [...prev, songToAdd]);
        }
        setIsSearchingToAdd(false);
        setSongSearchQuery('');
      } else {
        const data = await res.json();
        alert(data.error || t('songbook.addSongError'));
      }
    } catch (error) {
      console.error('Failed to add song to playlist', error);
    }
  };

  const handleRemoveSongFromPlaylist = async (songId: string, songTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongToRemove({ id: songId, title: songTitle });
  };

  const confirmRemoveSong = async () => {
    if (!songToRemove || !selectedPlaylistId) return;
    const songId = songToRemove.id;
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylistId}/songs/${songId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
      }
    } catch (error) {
      console.error('Failed to remove song from playlist', error);
    } finally {
      setSongToRemove(null);
    }
  };

  const favoritesCount = songs.filter(s => s.isFavorite).length;
  const recentSongIds = JSON.parse(localStorage.getItem('recentSongIds') || '[]');
  const recentCount = recentSongIds.length;

  const filteredSearchSongs = songs.filter(s => 
    (s.title.toLowerCase().includes(songSearchQuery.toLowerCase()) || 
     artists.find(a => a.id === s.artistId)?.name.toLowerCase().includes(songSearchQuery.toLowerCase())) &&
    !playlistSongs.find(ps => ps.id === s.id)
  ).slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {selectedPlaylistId ? (() => {
        const isSpecial = selectedPlaylistId === 'recentes' || selectedPlaylistId === 'favoritas';
        const playlist = isSpecial 
          ? { name: selectedPlaylistId === 'recentes' ? t('playlists.recent') : t('playlists.favorites') }
          : playlists.find(p => p.id === selectedPlaylistId);
        
        return (
          <div className="flex flex-col h-full">
            <div className="p-4 flex items-center gap-4 border-b border-border-color">
              <button 
                onClick={() => onSelectPlaylist(null)}
                className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-xl text-text-primary truncate">{playlist?.name}</h2>
                <p className="text-xs text-text-secondary">{t('playlists.songsCount', { count: playlistSongs.length })}</p>
              </div>
              {!isSpecial && (
                <button
                  onClick={() => setIsSearchingToAdd(!isSearchingToAdd)}
                  className={`p-2 rounded-full transition-colors ${isSearchingToAdd ? 'bg-jumas-green text-white' : 'bg-bg-secondary text-text-secondary hover:text-jumas-green'}`}
                  title={t('playlists.addSongTitle')}
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isSearchingToAdd && (
                <div className="mb-6 bg-bg-elevated p-4 rounded-2xl border border-border-color shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-sm text-text-primary">{t('playlists.addSongTitle')}</h3>
                    <button onClick={() => setIsSearchingToAdd(false)} className="text-text-secondary hover:text-text-primary">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      autoFocus
                      placeholder={t('playlists.searchPlaceholder')}
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-color rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-jumas-green"
                    />
                  </div>
                  
                  {songSearchQuery && (
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredSearchSongs.length > 0 ? (
                        filteredSearchSongs.map((song, index) => (
                          <button
                            key={`${song.id}-${index}`}
                            onClick={() => handleAddSongToPlaylist(song.id)}
                            className="flex items-center gap-3 p-2 hover:bg-bg-secondary rounded-lg transition-colors text-left group"
                          >
                            <SongCover 
                              song={song} 
                              artist={artists.find(a => a.id === song.artistId)} 
                              className="w-8 h-8 rounded flex-shrink-0"
                              iconSize={14}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text-primary truncate">{song.title}</p>
                              <p className="text-[10px] text-text-secondary truncate">
                                {artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist')}
                              </p>
                            </div>
                            <Plus size={14} className="text-jumas-green" />
                          </button>
                        ))
                      ) : (
                        <p className="text-center py-4 text-xs text-text-secondary">{t('playlists.noSongsFound')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isLoadingSongs ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-jumas-green"></div>
                </div>
              ) : playlistSongs.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <Music size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="mb-4">{t('playlists.emptyPlaylist')}</p>
                  {!isSpecial && (
                    <button
                      onClick={() => setIsSearchingToAdd(true)}
                      className="px-4 py-2 bg-jumas-green text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
                    >
                      {t('playlists.addFirstSong')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {playlistSongs.map((song: any, index: number) => (
                    <div
                      key={`${song.id}-${index}`}
                      onClick={() => onSelectSong(song.id)}
                      className="w-full flex items-center gap-4 p-3 bg-bg-elevated hover:bg-bg-secondary rounded-xl border border-border-color transition-all text-left cursor-pointer group"
                    >
                      <SongCover 
                        song={song} 
                        artist={artists.find(a => a.id === song.artistId)} 
                        className="w-10 h-10 rounded-lg"
                        iconSize={20}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text-primary truncate">{song.title}</h3>
                        <p className="text-xs text-text-secondary truncate">
                          {artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist')}
                        </p>
                      </div>
                      {!isSpecial && (
                        <button
                          onClick={(e) => handleRemoveSongFromPlaylist(song.id, song.title, e)}
                          className="p-2 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t('playlists.removeFromList')}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })() : (
        <>
          {/* Header */}
          <div className="p-4 flex justify-between items-center">
            <h2 className="font-bold text-2xl text-text-primary">{t('playlists.title')}</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
            >
              <Plus size={28} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-4 flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'All' 
                  ? 'bg-white text-black' 
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {t('playlists.tabAll')}
            </button>
            <button
              onClick={() => setActiveTab('Created')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'Created' 
                  ? 'bg-white text-black' 
                  : 'bg-bg-secondary text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {t('playlists.tabCreated')}
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
            <div className="flex flex-col gap-3">
              {activeTab === 'All' && (
                <>
                  {/* Recentes */}
                  <button
                    onClick={() => onSelectPlaylist('recentes')}
                    className="w-full flex items-center gap-4 p-4 bg-bg-elevated rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all group"
                  >
                    <div className="w-12 h-12 bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-500">
                      <History size={24} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-text-primary">{t('playlists.recent')}</h3>
                      <p className="text-xs text-text-secondary">{t('playlists.songsCount', { count: recentCount })}</p>
                    </div>
                    <MoreVertical size={20} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Quick Access Recentes */}
                  {recentCount > 0 && (
                    <div className="flex flex-col gap-2 ml-4 border-l-2 border-border-color pl-4 mb-2">
                      {recentSongIds.slice(0, 3).map((id: string, index: number) => {
                        const song = songs.find(s => s.id === id);
                        if (!song) return null;
                        return (
                          <button
                            key={`quick-recent-${song.id}-${index}`}
                            onClick={() => onSelectSong(song.id)}
                            className="flex items-center gap-3 py-2 text-left hover:text-jumas-green transition-colors"
                          >
                            <SongCover 
                              song={song} 
                              artist={artists.find(a => a.id === song.artistId)} 
                              className="w-8 h-8 rounded-lg flex-shrink-0"
                              iconSize={16}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-text-primary truncate leading-tight">{song.title}</p>
                              <p className="text-[10px] text-text-secondary truncate">
                                {artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist')}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      {recentCount > 3 && (
                        <button 
                          onClick={() => onSelectPlaylist('recentes')}
                          className="text-[10px] font-bold text-jumas-green hover:underline text-left"
                        >
                          {t('playlists.viewAllRecent', { count: recentCount })}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Favoritas */}
                  <button
                    onClick={() => onSelectPlaylist('favoritas')}
                    className="w-full flex items-center gap-4 p-4 bg-bg-elevated rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all group"
                  >
                    <div className="w-12 h-12 bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-500">
                      <Heart size={24} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-text-primary">{t('playlists.favorites')}</h3>
                      <p className="text-xs text-text-secondary">{t('playlists.songsCount', { count: favoritesCount })}</p>
                    </div>
                    <MoreVertical size={20} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  {/* Quick Access Favoritas */}
                  {favoritesCount > 0 && (
                    <div className="flex flex-col gap-2 ml-4 border-l-2 border-border-color pl-4 mb-2">
                      {songs.filter(s => s.isFavorite).slice(0, 3).map((song: any, index: number) => (
                        <button
                          key={`quick-fav-${song.id}-${index}`}
                          onClick={() => onSelectSong(song.id)}
                          className="flex items-center gap-3 py-2 text-left hover:text-jumas-green transition-colors"
                        >
                          <SongCover 
                            song={song} 
                            artist={artists.find(a => a.id === song.artistId)} 
                            className="w-8 h-8 rounded-lg flex-shrink-0"
                            iconSize={16}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate leading-tight">{song.title}</p>
                            <p className="text-[10px] text-text-secondary truncate">
                              {artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist')}
                            </p>
                          </div>
                        </button>
                      ))}
                      {favoritesCount > 3 && (
                        <button 
                          onClick={() => onSelectPlaylist('favoritas')}
                          className="text-[10px] font-bold text-jumas-green hover:underline text-left"
                        >
                          {t('playlists.viewAllFavorites', { count: favoritesCount })}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* User Playlists */}
              {playlists.map((playlist, index) => (
                <div
                  key={`${playlist.id}-${index}`}
                  onClick={() => onSelectPlaylist(playlist.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectPlaylist(playlist.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-pointer ${
                    selectedPlaylistId === playlist.id
                      ? 'bg-jumas-green/10 border-jumas-green/30'
                      : 'bg-bg-elevated border-border-color hover:border-jumas-green/30'
                  }`}
                >
                  <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center text-text-secondary">
                    <ListMusic size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-text-primary">{playlist.name}</h3>
                    <p className="text-xs text-text-secondary">
                      {t('playlists.songsCount', { count: songs.filter(s => s.playlistId === playlist.id).length })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist, e);
                      }}
                      className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                      title={t('playlists.deleteList')}
                    >
                      <Trash2 size={16} />
                    </button>
                    <MoreVertical size={20} className="text-text-secondary" />
                  </div>
                </div>
              ))}

              {/* Nova Lista Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full flex items-center gap-4 p-4 bg-bg-elevated rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all"
              >
                <div className="w-12 h-12 bg-bg-secondary rounded-xl flex items-center justify-center text-text-primary">
                  <Plus size={24} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-text-primary">{t('playlists.newPlaylist')}</h3>
                </div>
              </button>

              {/* Summary Footer */}
              <div className="mt-4 p-6 bg-bg-elevated/50 rounded-3xl border border-border-color/50">
                <p className="text-sm font-bold text-text-primary mb-1">
                  {t('playlists.songsCount', { count: songs.length })}, {t('playlists.songsCount', { count: playlists.length + 2 }).replace('músicas', 'listas').replace('canciones', 'listas')}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Download size={12} />
                  <span>{t('playlists.availableOffline')}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-elevated rounded-3xl p-6 shadow-2xl border border-border-color"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-primary">{t('playlists.newPlaylist')}</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">{t('playlists.playlistName')} *</label>
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-2.5 focus:outline-none focus:border-jumas-green"
                    placeholder={t('playlists.placeholderPlaylistName')}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-jumas-green text-white rounded-xl font-bold hover:bg-green-700 transition-colors mt-2"
                >
                  {t('playlists.createPlaylist')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!playlistToDelete}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={confirmDeletePlaylist}
        title={t('playlists.deleteConfirmTitle')}
        message={
          <p>
            {t('playlists.deleteConfirmMessage', { name: playlistToDelete?.name })}
          </p>
        }
        confirmLabel={t('playlists.confirmDelete')}
      />

      <ConfirmModal
        isOpen={!!songToRemove}
        onClose={() => setSongToRemove(null)}
        onConfirm={confirmRemoveSong}
        title={t('playlists.removeConfirmTitle')}
        message={
          <p>
            {t('playlists.removeConfirmMessage', { title: songToRemove?.title })}
          </p>
        }
        confirmLabel={t('playlists.removeFromList')}
      />
    </div>
  );
};
