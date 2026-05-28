import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { categories as initialCategories, songs as initialSongs, songbooks as initialSongbooks } from '../data/mockData';
import { ChevronLeft, Search, Music, Plus, Trash2, ChevronDown, Book, Edit2, ChevronRight, Home, Heart, FileText, X, List, ExternalLink, Minus, Type, Play, Pause, FastForward, Rewind, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AddSongModal } from './AddSongModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeleteSongbookConfirmModal } from './DeleteSongbookConfirmModal';
import { AddSongbookModal } from './AddSongbookModal';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { ManageArtistsModal } from './ManageArtistsModal';
import { PdfViewer } from './PdfViewer';
import { Header } from './Header';
import { UserManagementModal } from './UserManagementModal';
import { AdminSettingsModal } from './AdminSettingsModal';
import { ProfileView } from './ProfileView';
import { Tuner } from './Tuner';
import { PlaylistsView } from './PlaylistsView';
import { AcademyView } from './AcademyView';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Toast, ToastType } from './Toast';
import { Settings, User, ShieldCheck, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { renderSongContent, extractChords } from '../utils/chordParser';
import { ChordDiagrams } from './ChordDiagrams';
import { SongCover } from './SongCover';
import { fetchWithCache, loadFromCache, saveToCache } from '../hooks/useOfflineCache';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const Songbook: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOnline = useOnlineStatus();

  const [songbooks, setSongbooks] = useState<{id: string, name: string, image?: string, pdfUrl?: string}[]>(() => {
    const cached = loadFromCache<any[]>('songbooks');
    return cached && cached.length > 0 ? cached : [];
  });
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [artists, setArtists] = useState<{id: string, name: string, photoUrl?: string, biography?: string}[]>(() => {
    const cached = loadFromCache<any[]>('artists');
    return cached && cached.length > 0 ? cached : [];
  });
  const [songs, setSongs] = useState<any[]>(() => {
    const cached = loadFromCache<any[]>('songs');
    return cached && cached.length > 0 ? cached : [];
  });
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isLoadingSongbooks, setIsLoadingSongbooks] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  useEffect(() => {
    // ── Stale-While-Revalidate ─────────────────────────────────────────────────
    // 1) Mostrar cache LOCAL imediatamente (sem await, sem esperar rede)
    // 2) Buscar dados frescos da rede em background e atualizar silenciosamente

    const mapSongbook = (sb: any) => ({ ...sb, id: sb.id.toString() });
    const mapArtist   = (a: any)  => ({ ...a, id: a.id.toString() });
    const mapSong     = (s: any)  => ({
      ...s,
      id: s.id.toString(),
      songbookId: s.songbookId.toString(),
      artistId: s.artistId ? s.artistId.toString() : null,
      artistIds: s.artistIds || [],
      isFavorite: !!s.isFavorite,
    });
    const mapPlaylist = (p: any) => ({ ...p, id: p.id.toString() });

    // — Fase 1: Inicialização síncrona (feita no useState) —
    // Cache é carregado antes da renderização inicial

    // — Fase 2: revalidar da rede em background —
    const revalidate = async () => {
      try {
        // Songbooks (prioridade — aparece na home)
        const sbRes = await fetch('/api/songbooks');
        if (sbRes.ok) {
          const data = await sbRes.json();
          const fresh = data.songbooks.map(mapSongbook);
          setSongbooks(fresh);
          saveToCache('songbooks', fresh);
        }
      } catch { /* mantém o cache */ } finally {
        setIsLoadingSongbooks(false); // garante que o spinner sai mesmo sem cache
      }

      // Artistas e músicas em paralelo
      try {
        const [artRes, songRes] = await Promise.all([
          fetch('/api/artists'),
          fetch('/api/songs'),
        ]);
        if (artRes.ok) {
          const data = await artRes.json();
          const fresh = data.artists.map(mapArtist);
          setArtists(fresh);
          saveToCache('artists', fresh);
        }
        if (songRes.ok) {
          const data = await songRes.json();
          const fresh = data.songs.map(mapSong);
          setSongs(fresh);
          saveToCache('songs', fresh);
        }
      } catch { /* mantém o cache */ } finally {
        setIsLoadingSongs(false);
      }

      // Playlists (requer auth, sem cache)
      try {
        const playRes = await fetch('/api/playlists');
        if (playRes.ok) {
          const data = await playRes.json();
          setPlaylists(data.playlists.map(mapPlaylist));
        }
      } catch { /* sem playlists offline é aceitável */ }
    };

    revalidate();
  }, []);

  const [activeSongbookId, setActiveSongbookId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedArtistProfileId, setSelectedArtistProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSongbookModalOpen, setIsAddSongbookModalOpen] = useState(false);
  const [songbookToEdit, setSongbookToEdit] = useState<{id: string, name: string, image?: string, pdfUrl?: string} | null>(null);
  const [songToDelete, setSongToDelete] = useState<{id: string, title: string} | null>(null);
  const [songToEdit, setSongToEdit] = useState<any>(null);
  const [songbookToDelete, setSongbookToDelete] = useState<{id: string, name: string, songCount: number} | null>(null);
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [isListsActive, setIsListsActive] = useState(false);
  const [wasInLists, setWasInLists] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [isPdfActive, setIsPdfActive] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [isManageArtistsModalOpen, setIsManageArtistsModalOpen] = useState(false);
  const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
  const [isAdminSettingsModalOpen, setIsAdminSettingsModalOpen] = useState(false);
  const [isTunerActive, setIsTunerActive] = useState(false);
  const [isAcademyActive, setIsAcademyActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [recentSongIds, setRecentSongIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSongIds');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('recentSongIds', JSON.stringify(recentSongIds));
  }, [recentSongIds]);

  useEffect(() => {
    if (selectedSongId) {
      setRecentSongIds(prev => {
        const filtered = prev.filter(id => id !== selectedSongId);
        return [selectedSongId, ...filtered].slice(0, 20);
      });
    }
  }, [selectedSongId]);
  useEffect(() => {
    if (selectedSongId && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      accumulatedScrollRef.current = 0;
      setIsAutoScrolling(false);
    }
  }, [selectedSongId]);

  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [activeChord, setActiveChord] = useState<string | null>(null);
  const [songTab, setSongTab] = useState<'principal' | 'simplified' | 'lyrics'>('principal');

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [showAutoScrollPanel, setShowAutoScrollPanel] = useState(false);
  const isAutoScrollingRef = React.useRef(false);
  const accumulatedScrollRef = React.useRef(0);
  
  useEffect(() => {
    isAutoScrollingRef.current = isAutoScrolling;
  }, [isAutoScrolling]);

  const [scrollSpeed, setScrollSpeed] = useState(50); // 1-100
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // With relative scrolling, we don't need to sync a position ref.
      // We just reset the sub-pixel accumulator if the user scrolls manually
      // while auto-scroll is off to ensure a clean start.
      if (!isAutoScrollingRef.current) {
        accumulatedScrollRef.current = 0;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedSongId]); // Re-attach when song changes

  useEffect(() => {
    if (!showAutoScrollPanel) {
      setIsAutoScrolling(false);
    }
  }, [showAutoScrollPanel]);

  useEffect(() => {
    if (!isAutoScrolling) return;
    
    let lastTime = performance.now();
    let accumulated = 0;
    let frameId: number;
    let active = true;

    // Find the actual scrollable element - walk up the DOM tree
    const findScrollableElement = (): HTMLElement | null => {
      let el = scrollContainerRef.current;
      while (el) {
        if (el.scrollHeight > el.clientHeight + 5) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const tick = (now: number) => {
      if (!active) return;

      const delta = Math.min(now - lastTime, 100); // cap to avoid huge jumps
      lastTime = now;

      // Speed: 5px/s (1%) to 305px/s (100%)
      const speed = (5 + (scrollSpeed * 3)) / 1000;
      accumulated += speed * delta;

      if (accumulated >= 1) {
        const move = Math.floor(accumulated);
        accumulated -= move;
        
        const scrollEl = findScrollableElement();
        
        if (scrollEl) {
          // Scroll the found scrollable element
          const prevTop = scrollEl.scrollTop;
          scrollEl.scrollTop = prevTop + move;
          
          const isAtBottom = Math.ceil(scrollEl.scrollTop + scrollEl.clientHeight) >= scrollEl.scrollHeight - 5;
          if (isAtBottom) {
            setIsAutoScrolling(false);
            return;
          }
        } else {
          // Fallback: scroll the window
          const prevY = window.scrollY;
          window.scrollBy(0, move);
          
          const isAtBottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 5;
          if (isAtBottom || window.scrollY === prevY) {
            setIsAutoScrolling(false);
            return;
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [isAutoScrolling, scrollSpeed]);

  useEffect(() => {
    setActiveChord(null);
    setSongTab('principal');
    setIsAutoScrolling(false);
  }, [selectedSongId]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Derive categories for the active songbook or favorites
  const currentSongs = isListsActive 
    ? songs.filter(s => s.isFavorite)
    : songs.filter(s => s.songbookId === activeSongbookId);
    
  const currentCategories = Array.from(new Set(currentSongs.map(s => s.category)));
  const displayCategories = categories.filter(c => currentCategories.includes(c));
  const customCategories = currentCategories.filter(c => !categories.includes(c)).sort();
  const finalCategories = Array.from(new Set(['Todos', ...displayCategories, ...customCategories]));

  const topSongs = [...songs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 10);

  useEffect(() => {
    if (activeSongbookId || isListsActive) {
      if (finalCategories.length > 0 && !finalCategories.includes(activeCategory)) {
        setActiveCategory('Todos');
      } else if (finalCategories.length === 0) {
        setActiveCategory('Todos');
      }
    }
  }, [activeSongbookId, isListsActive, songs]);

  const handleAddOrEditSongbook = async (newSongbook: { id: string; name: string; image?: string; pdfUrl?: string }, importedSongs?: any[]) => {
    console.log('Handling songbook:', newSongbook, 'Imported songs count:', importedSongs?.length);
    try {
      if (songbookToEdit) {
        const res = await fetch(`/api/songbooks/${newSongbook.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSongbook)
        });
        if (res.ok) {
          setSongbooks(prev => prev.map(sb => sb.id === newSongbook.id ? newSongbook : sb));
          alert('Cancioneiro atualizado com sucesso!');
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao atualizar cancioneiro');
        }
      } else {
        const res = await fetch('/api/songbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSongbook)
        });
        if (res.ok) {
          const data = await res.json();
          const createdSb = { ...data.songbook, id: data.songbook.id.toString() };
          setSongbooks(prev => [...prev, createdSb]);
          
          // Automatically select the new songbook
          setActiveSongbookId(createdSb.id);
          setSearchQuery('');
          
          // If it has a PDF and no songs are being imported, show the PDF view
          if (createdSb.pdfUrl && (!importedSongs || importedSongs.length === 0)) {
            setIsPdfActive(true);
          } else {
            setIsPdfActive(false);
          }
          
          if (importedSongs && importedSongs.length > 0) {
            for (const s of importedSongs) {
              await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...s, songbookId: createdSb.id })
              });
            }
            // Refresh songs
            const songRes = await fetch('/api/songs');
            if (songRes.ok) {
              const songData = await songRes.json();
              setSongs(songData.songs.map((s: any) => ({ 
                ...s, 
                id: s.id.toString(), 
                songbookId: s.songbookId.toString(),
                artistId: s.artistId?.toString(),
                artistIds: s.artistIds || [],
                isFavorite: !!s.isFavorite
              })));
            }
          }
          alert('Cancioneiro criado com sucesso!');
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao criar cancioneiro');
        }
      }
    } catch (error) {
      console.error('Failed to handle songbook', error);
      alert('Erro de conexão ao salvar cancioneiro');
    }
    
    setSongbookToEdit(null);
  };

  const handleAddSong = async (newSong: { 
    id?: string; 
    title: string; 
    category: string; 
    number: number; 
    content: string; 
    content_simplified?: string;
    content_lyrics?: string;
    songbookId: string; 
    artistId?: string; 
    imageUrl?: string; 
    videoUrl?: string;
    videoUrls?: string[];
  }) => {
    try {
      if (newSong.id) {
        // Edit existing song
        const res = await fetch(`/api/songs/${newSong.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong)
        });
        
        if (res.ok) {
          setSongs(prev => prev.map(s => s.id === newSong.id ? { ...s, ...newSong } : s));
          
          if (!categories.includes(newSong.category)) {
            setCategories(prev => [...prev, newSong.category]);
          }
        } else {
          alert('Erro ao editar cifra');
        }
      } else {
        // Add new song
        const res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong)
        });
        
        if (res.ok) {
          const data = await res.json();
          const songEntry = {
            ...data.song,
            id: data.song.id.toString(),
            songbookId: data.song.songbookId.toString(),
            artistId: data.song.artistId ? data.song.artistId.toString() : null,
            artistIds: data.song.artistIds || [],
            isFavorite: !!data.song.isFavorite,
            videoUrl: data.song.videoUrl,
            videoUrls: data.song.videoUrls || []
          };
          
          setSongs(prev => [...prev, songEntry].sort((a, b) => a.number - b.number));
          
          if (!categories.includes(newSong.category)) {
            setCategories(prev => [...prev, newSong.category]);
          }
          
          setActiveSongbookId(songEntry.songbookId);
          setActiveCategory(songEntry.category);
          setSelectedSongId(songEntry.id);
          setSelectedArtistProfileId(null);
        } else {
          alert('Erro ao adicionar cifra');
        }
      }
    } catch (error) {
      console.error('Failed to save song', error);
      alert('Erro de conexão ao salvar cifra');
    }
    setSongToEdit(null);
  };

  const handleDeleteSong = async (id: string) => {
    try {
      const res = await fetch(`/api/songs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id));
        if (selectedSongId === id) {
          setSelectedSongId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete song', error);
    }
  };

  const incrementViewCount = async (id: string) => {
    try {
      await fetch(`/api/songs/${id}/view`, { method: 'POST' });
      setSongs(prev => prev.map(s => s.id === id ? { ...s, view_count: (s.view_count || 0) + 1 } : s));
    } catch (error) {
      console.error('Failed to increment view count', error);
    }
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const toggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/songs/${id}/favorite`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: data.isFavorite } : s));
        showToast(data.isFavorite ? t('songbook.addedToFavorites') : t('songbook.removedFromFavorites'));
      } else if (res.status === 401) {
        showToast(t('songbook.mustBeLoggedIn'), 'error');
      } else {
        const data = await res.json();
        showToast(data.error || t('songbook.errorFavoriting'), 'error');
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      showToast(t('profile.connError'), 'error');
    }
  };

  const filteredSongs = songs.filter(s => {
    if (isListsActive && selectedPlaylistId) {
      // The PlaylistsView handles its own song filtering/display.
      return false;
    }

    const songbook = songbooks.find(sb => sb.id === s.songbookId);
    const artist = artists.find(a => a.id === s.artistId);
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = s.title.toLowerCase().includes(query) || 
                          s.number.toString().includes(query) ||
                          (songbook && songbook.name.toLowerCase().includes(query)) ||
                          ((artist && artist.name.toLowerCase().includes(query)) || (s.artistIds && s.artistIds.some(id => artists.find(a => a.id === id)?.name.toLowerCase().includes(query))));
    
    const matchesCategory = activeCategory === 'Todos' || s.category === activeCategory;

    if (isGlobalSearchActive) return matchesSearch;
    if (isListsActive) return s.isFavorite && matchesCategory && matchesSearch;
    
    const matchesSongbook = s.songbookId === activeSongbookId;
    
    if (searchQuery) return matchesSearch && matchesSongbook;
    return matchesSongbook && matchesCategory;
  }).sort((a, b) => a.number - b.number);

  const filteredArtists = isGlobalSearchActive && searchQuery
    ? artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleNextSong = () => {
    if (!selectedSongId || filteredSongs.length <= 1) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === selectedSongId);
    const nextIndex = (currentIndex + 1) % filteredSongs.length;
    setSelectedSongId(filteredSongs[nextIndex].id);
  };

  const handlePrevSong = () => {
    if (!selectedSongId || filteredSongs.length <= 1) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === selectedSongId);
    const prevIndex = (currentIndex - 1 + filteredSongs.length) % filteredSongs.length;
    setSelectedSongId(filteredSongs[prevIndex].id);
  };

  const selectedSong = songs.find(s => s.id === selectedSongId);
  const activeSongbook = songbooks.find(sb => sb.id === activeSongbookId);
  const selectedArtist = selectedSong?.artistId ? artists.find(a => a.id === selectedSong?.artistId) : null;
  const selectedArtistProfile = artists.find(a => a.id === selectedArtistProfileId);

  const resetToHome = () => {
    setActiveSongbookId(null);
    setSelectedSongId(null);
    setSelectedArtistProfileId(null);
    setSearchQuery('');
    setIsGlobalSearchActive(false);
    setIsListsActive(false);
    setIsProfileActive(false);
    setIsPdfActive(false);
    setIsTunerActive(false);
    setIsAcademyActive(false);
    setIsHeaderSearchOpen(false);
  };

  const goToAcademy = () => {
    setIsAcademyActive(true);
    setIsGlobalSearchActive(false);
    setIsListsActive(false);
    setIsProfileActive(false);
    setIsPdfActive(false);
    setIsTunerActive(false);
    setActiveSongbookId(null);
    setSelectedSongId(null);
    setSelectedArtistProfileId(null);
    setSearchQuery('');
  };

  const BottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-color px-2 py-2 flex items-center justify-around z-50 transition-transform duration-300 translate-y-0">
      <button 
        onClick={resetToHome}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${!activeSongbookId && !isGlobalSearchActive && !isListsActive && !isProfileActive && !isAcademyActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {!activeSongbookId && !isGlobalSearchActive && !isListsActive && !isProfileActive && !isAcademyActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Home size={24} />
        <span className="text-[10px] font-medium">{t('songbook.home')}</span>
      </button>

      <button 
        onClick={() => {
          setIsListsActive(true);
          setActiveCategory('Todos');
          setSelectedPlaylistId(null);
          setIsGlobalSearchActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isListsActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isListsActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <List size={24} />
        <span className="text-[10px] font-medium">{t('songbook.playlists')}</span>
      </button>

      <button 
        onClick={() => {
          setIsAcademyActive(true);
          setIsGlobalSearchActive(false);
          setIsListsActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isAcademyActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isAcademyActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Book size={24} />
        <span className="text-[10px] font-medium">{t('songbook.academy')}</span>
      </button>
      
      <button 
        onClick={() => {
          setIsTunerActive(true);
          setIsGlobalSearchActive(false);
          setIsListsActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(false);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isTunerActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isTunerActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Volume2 size={24} />
        <span className="text-[10px] font-medium">{t('songbook.tuner')}</span>
      </button>

      <button 
        onClick={() => {
          setIsGlobalSearchActive(true);
          setIsListsActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(true);
          setSearchQuery('');
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="quer tocar"]');
            if (searchInput instanceof HTMLInputElement) {
              searchInput.focus();
            }
          }, 100);
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isGlobalSearchActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isGlobalSearchActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Search size={24} />
        <span className="text-[10px] font-medium">Busca</span>
      </button>

      <button 
        onClick={() => {
          setIsProfileActive(true);
          setIsGlobalSearchActive(false);
          setIsListsActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(false);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isProfileActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isProfileActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <User size={24} />
        <span className="text-[10px] font-medium">Mais</span>
      </button>
    </div>
  );

  const renderModals = () => (
    <>
      <AddSongModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setSongToEdit(null);
        }} 
        onAdd={handleAddSong}
        categories={categories}
        songbooks={songbooks}
        activeSongbookId={activeSongbookId || songbooks[0]?.id || ''}
        artists={artists}
        editData={songToEdit}
      />

      <AddSongbookModal
        isOpen={isAddSongbookModalOpen}
        onClose={() => {
          setIsAddSongbookModalOpen(false);
          setSongbookToEdit(null);
        }}
        onAdd={handleAddOrEditSongbook}
        editData={songbookToEdit}
      />

      <DeleteConfirmModal
        isOpen={!!songToDelete}
        onClose={() => setSongToDelete(null)}
        onConfirm={() => {
          if (songToDelete) {
            handleDeleteSong(songToDelete.id);
            setSongToDelete(null);
          }
        }}
        songTitle={songToDelete?.title || ''}
      />

      <DeleteSongbookConfirmModal 
        isOpen={!!songbookToDelete}
        onClose={() => setSongbookToDelete(null)}
        songbookName={songbookToDelete?.name || ''}
        songCount={songbookToDelete?.songCount || 0}
        onConfirm={async () => {
          if (songbookToDelete) {
            try {
              const res = await fetch(`/api/songbooks/${songbookToDelete.id}`, { method: 'DELETE' });
              if (res.ok) {
                setSongbooks(prev => prev.filter(item => item.id !== songbookToDelete.id));
                setSongs(prev => prev.filter(s => s.songbookId !== songbookToDelete.id));
              }
            } catch (error) {
              console.error('Failed to delete songbook', error);
            } finally {
              setSongbookToDelete(null);
            }
          }
        }}
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesModalOpen}
        onClose={() => setIsManageCategoriesModalOpen(false)}
        categories={categories}
        onUpdateCategories={setCategories}
        songs={songs}
        onUpdateSongs={setSongs}
      />

      <ManageArtistsModal
        isOpen={isManageArtistsModalOpen}
        onClose={() => setIsManageArtistsModalOpen(false)}
        artists={artists}
        onUpdateArtists={setArtists}
        songs={songs}
        onUpdateSongs={setSongs}
      />

      <UserManagementModal
        isOpen={isManageUsersModalOpen}
        onClose={() => setIsManageUsersModalOpen(false)}
      />

      <AdminSettingsModal
        isOpen={isAdminSettingsModalOpen}
        onClose={() => setIsAdminSettingsModalOpen(false)}
      />
    </>
  );

  if (isListsActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSettingsClick={() => setIsAdminSettingsModalOpen(true)}
          onProfileClick={() => {
            setIsProfileActive(true);
            setIsGlobalSearchActive(false);
            setIsListsActive(false);
            setIsAcademyActive(false);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
          onAcademyClick={goToAcademy}
          isAcademyActive={isAcademyActive}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PlaylistsView 
            onSelectPlaylist={(id) => {
              setSelectedPlaylistId(id);
            }}
            onSelectSong={(id) => {
              const song = songs.find(s => s.id === id);
              if (song) {
                setActiveSongbookId(song.songbookId);
                setSelectedSongId(id);
                setIsListsActive(false);
                setWasInLists(true);
                setIsTunerActive(false);
                setIsPdfActive(false);
                incrementViewCount(id);
              }
            }}
            selectedPlaylistId={selectedPlaylistId}
            songs={songs}
            artists={artists}
            playlists={playlists}
            setPlaylists={setPlaylists}
          />
        </div>
        <BottomNav />
        {renderModals()}
        <AddToPlaylistModal 
          isOpen={isAddToPlaylistModalOpen}
          onClose={() => setIsAddToPlaylistModalOpen(false)}
          songId={songToAddToPlaylist}
          playlists={playlists}
          onAdd={async (playlistId, songId) => {
            try {
              const res = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songId })
              });
              if (res.ok) {
                setIsAddToPlaylistModalOpen(false);
              } else {
                const data = await res.json();
                showToast(data.error || 'Erro ao adicionar música', 'error');
              }
            } catch (error) {
              console.error('Failed to add song to playlist', error);
              showToast('Erro ao adicionar música', 'error');
            }
          }}
          showToast={showToast}
        />
      </>
    );
  }

  if (isAcademyActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsAcademyActive(false);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
          onAcademyClick={goToAcademy}
          isAcademyActive={true}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AcademyView />
        </div>
        <BottomNav />
        {renderModals()}
      </>
    );
  }

  if (isProfileActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
          onAcademyClick={goToAcademy}
          isAcademyActive={isAcademyActive}
        />
        <div className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 overflow-y-auto">
          <ProfileView 
            onOpenUserManagement={() => setIsManageUsersModalOpen(true)}
            onOpenCategoryManagement={() => setIsManageCategoriesModalOpen(true)}
            onOpenArtistManagement={() => setIsManageArtistsModalOpen(true)}
            onOpenAddSongbook={() => setIsAddSongbookModalOpen(true)}
            onOpenAdminSettings={() => setIsAdminSettingsModalOpen(true)}
          />
        </div>
        <BottomNav />
        {renderModals()}
      </>
    );
  }

  if (isTunerActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
          onAcademyClick={goToAcademy}
          isAcademyActive={isAcademyActive}
        />
        <div className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 overflow-y-auto pb-24">
          <div className="bg-bg-elevated rounded-3xl border border-border-color shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center gap-4 sticky top-0 z-10">
              <button 
                className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                onClick={() => setIsTunerActive(false)}
                title="Voltar"
              >
                <ChevronLeft size={24} />
                <span className="hidden md:inline font-bold text-sm">Voltar</span>
              </button>
              <h2 className="font-bold text-xl text-text-primary">Afinador</h2>
            </div>
            <div className="flex-1 flex flex-col">
              <Tuner />
            </div>
          </div>
        </div>
        <BottomNav />
        {renderModals()}
      </>
    );
  }



  if (!activeSongbookId && !selectedSongId && !isGlobalSearchActive && !isListsActive && !isProfileActive && !isAcademyActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            if (query.trim() !== '') {
              setIsGlobalSearchActive(true);
              setIsTunerActive(false);
            }
          }}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={true}
          onAcademyClick={goToAcademy}
          isAcademyActive={isAcademyActive}
        />
        <div className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 overflow-y-auto pb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">{t('songbook.history')}</h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button 
                  onClick={() => {
                    setSongbookToEdit(null);
                    setIsAddSongbookModalOpen(true);
                  }}
                  className="p-3 bg-jumas-green text-white rounded-2xl shadow-lg shadow-jumas-green/20 active:scale-95 transition-all"
                  title={t('songbook.newSongbookTitle')}
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Skeleton loading — enquanto busca da rede */}
          {isLoadingSongbooks && songbooks.length === 0 && (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-bg-elevated rounded-2xl border border-border-color animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-bg-secondary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-secondary rounded-lg w-2/3" />
                    <div className="h-3 bg-bg-secondary rounded-lg w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado vazio — só mostra quando terminou de carregar e não tem nada */}
          {!isLoadingSongbooks && songbooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-6">
              <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Book size={32} className="text-text-secondary opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {isAdmin ? t('songbook.emptyStateTitle') : t('songbook.emptyStateTitleLimited')}
              </h3>
              <p className="text-text-secondary text-sm max-w-xs mb-8 leading-relaxed">
                {isAdmin 
                  ? t('songbook.emptyStateDesc')
                  : t('songbook.emptyStateDescLimited')}
              </p>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setSongbookToEdit(null);
                    setIsAddSongbookModalOpen(true);
                  }}
                  className="px-8 py-3.5 bg-jumas-green text-white rounded-2xl font-bold shadow-lg shadow-jumas-green/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  {t('songbook.createFirst')}
                </button>
              )}
            </div>
          )}
        
          <div className="flex flex-col gap-2">
          {songbooks.filter(sb => sb.name.toLowerCase().includes(searchQuery.toLowerCase())).map((sb, index) => {
            const songCount = songs.filter(s => s.songbookId === sb.id).length;
            return (
              <motion.div 
                key={`${sb.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                <button 
                  onClick={() => {
                    setActiveSongbookId(sb.id);
                    setIsTunerActive(false);
                    if (songCount === 0 && sb.pdfUrl) {
                      setIsPdfActive(true);
                    } else {
                      setIsPdfActive(false);
                    }
                  }}
                  className="w-full flex items-center gap-4 p-3 bg-bg-elevated rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-bg-secondary overflow-hidden flex-shrink-0 border border-border-color flex items-center justify-center">
                    {sb.image ? (
                      <img src={sb.image} alt={sb.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-jumas-green bg-jumas-green/10">
                        <Book size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-bold text-base text-text-primary truncate">{sb.name}</h3>

                  </div>
                </button>
                {isAdmin && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongbookToEdit(sb);
                        setIsAddSongbookModalOpen(true);
                      }}
                      className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-jumas-green border border-border-color"
                      title={t('common.edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongbookToDelete({
                          id: sb.id,
                          name: sb.name,
                          songCount: songCount
                        });
                      }}
                      className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-red-500 border border-border-color"
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
          
          {isAdmin && (
            <motion.button
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSongbookToEdit(null);
                setIsAddSongbookModalOpen(true);
              }}
              className="bg-bg-secondary/30 border-2 border-dashed border-border-color p-4 rounded-2xl hover:border-jumas-green hover:bg-jumas-green/5 transition-all flex items-center justify-center gap-4 text-text-secondary hover:text-jumas-green group"
            >
              <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center group-hover:bg-jumas-green/10 transition-colors">
                <Plus size={20} />
              </div>
              <span className="font-bold">Novo Cancioneiro</span>
            </motion.button>
          )}
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setSongbookToEdit(null);
              setIsAddSongbookModalOpen(true);
            }}
            className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-jumas-green text-white rounded-2xl shadow-2xl shadow-jumas-green/40 flex items-center justify-center z-40 active:scale-90 transition-all"
            aria-label="Novo Cancioneiro"
          >
            <Plus size={32} />
          </button>
        )}
      </div>
      <BottomNav />
      {renderModals()}
      </>
    );
  }

  return (
    <>
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchOpen={isHeaderSearchOpen}
        onSearchOpenChange={setIsHeaderSearchOpen}
        onOpenProfile={() => {
          setIsProfileActive(true);
          setIsHeaderSearchOpen(false);
          setIsTunerActive(false);
        }}
        onLogoClick={resetToHome}
        showSearch={true}
        onAcademyClick={goToAcademy}
        isAcademyActive={isAcademyActive}
      />
      <div className="flex-1 flex flex-col md:flex-row container mx-auto max-w-7xl p-0 md:p-6 gap-6 h-[calc(100dvh-64px)] overflow-hidden pb-16 md:pb-0">
        {/* Categories Sidebar (Desktop) / Header (Mobile) */}
      <div className={`md:w-64 flex flex-col gap-2 ${selectedSongId || selectedArtistProfileId || isPdfActive ? 'hidden md:flex' : 'flex'} p-4 md:p-0`}>
        
        {/* Back to Songbooks & Title */}
        <div className="md:px-2 md:pt-2 md:pb-4 md:border-b border-border-color md:mb-2">
          {!isGlobalSearchActive ? (
            <>
              <button 
                onClick={() => {
                  setActiveSongbookId(null);
                  setSelectedSongId(null);
                  setSelectedArtistProfileId(null);
                  setSearchQuery('');
                  setIsPdfActive(false);
                }}
                className="hidden md:flex items-center gap-2 text-text-secondary hover:text-jumas-green transition-colors mb-4 group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium text-sm">Cancioneiros</span>
              </button>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-2xl md:text-xl text-text-primary tracking-tight leading-tight line-clamp-2">
                    {activeSongbook?.name}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {activeSongbook?.pdfUrl && (
                    <button 
                      onClick={() => {
                        setIsPdfActive(!isPdfActive);
                        setSelectedSongId(null);
                        setSelectedArtistProfileId(null);
                      }}
                      className={`p-2 rounded-full transition-colors ${isPdfActive ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' : 'text-text-secondary hover:text-jumas-green bg-bg-secondary md:bg-transparent md:p-1'}`}
                      title={isPdfActive ? t('songbook.viewChords') : t('songbook.viewPdf')}
                    >
                      {isPdfActive ? <Music size={18} /> : <FileText size={18} />}
                    </button>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setSongbookToEdit(activeSongbook || null);
                        setIsAddSongbookModalOpen(true);
                      }}
                      className="text-text-secondary hover:text-jumas-green p-2 bg-bg-secondary rounded-full md:bg-transparent md:p-1 transition-colors"
                      title={t('songbook.editSongbook')}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-2xl md:text-xl text-text-primary tracking-tight leading-tight">
                {t('songbook.globalSearch')}
              </h2>
              <button 
                onClick={() => {
                  setIsGlobalSearchActive(false);
                  setSelectedArtistProfileId(null);
                  setSearchQuery('');
                  setIsHeaderSearchOpen(false);
                }}
                className="text-text-secondary hover:text-red-500 p-2 bg-bg-secondary rounded-full transition-colors"
                title={t('songbook.closeSearch')}
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <button
            onClick={() => {
              setIsListsActive(false);
              setIsGlobalSearchActive(false);
              setIsTunerActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${!isListsActive && !isGlobalSearchActive && !isTunerActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <Home size={18} />
            {t('songbook.home')}
          </button>
          <button
            onClick={() => {
              setIsListsActive(true);
              setActiveCategory('Todos');
              setSelectedPlaylistId(null);
              setIsTunerActive(false);
              setIsGlobalSearchActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isListsActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <List size={18} />
            {t('songbook.playlists')}
          </button>
          <button
            onClick={() => {
              setIsTunerActive(true);
              setIsListsActive(false);
              setIsGlobalSearchActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isTunerActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <Volume2 size={18} />
            {t('songbook.tuner')}
          </button>
        </div>

        {!isGlobalSearchActive && !isTunerActive && (
          <div className="mt-4 md:mt-0">
            <div className="flex items-center justify-between px-2 mb-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-text-secondary">{t('songbook.categories')}</h2>
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <div className="hidden md:flex items-center gap-1">
                    <button 
                      onClick={() => setIsManageArtistsModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title={t('profile.manageArtists')}
                    >
                      <User size={16} />
                    </button>
                    <button 
                      onClick={() => setIsManageCategoriesModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title={t('profile.manageCategories')}
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={() => setIsManageUsersModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title={t('profile.manageUsers')}
                    >
                      <ShieldCheck size={16} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setIsProfileActive(true);
                    setIsGlobalSearchActive(false);
                    setIsListsActive(false);
                    setIsPdfActive(false);
                    setActiveSongbookId(null);
                    setSelectedSongId(null);
                    setSelectedArtistProfileId(null);
                  }}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                  title={t('profile.title')}
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto md:overflow-y-auto flex md:flex-col flex-row gap-2 pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {finalCategories.map((cat, index) => {
                const isActive = activeCategory === cat && !searchQuery;
                return (
                  <button
                    key={`sidebar-cat-${cat}-${index}`}
                    onClick={() => { 
                      setActiveCategory(cat); 
                      setSelectedSongId(null); 
                      setSelectedArtistProfileId(null);
                      setSearchQuery(''); 
                      showToast(`${t('songbook.categoryPrefix')}${cat}`, 'info');
                    }}
                    className={`px-5 py-2.5 md:py-3 text-left whitespace-nowrap md:whitespace-normal text-sm md:text-base font-bold rounded-full md:rounded-xl transition-all duration-200 flex-shrink-0 md:flex-shrink border-2 ${
                      isActive
                        ? 'bg-jumas-green text-white border-jumas-green shadow-md shadow-jumas-green/20 scale-[1.02]' 
                        : 'text-text-secondary bg-bg-secondary/50 md:bg-transparent hover:bg-bg-primary hover:shadow-sm border-transparent md:border-transparent hover:border-border-color'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {finalCategories.length === 1 && finalCategories[0] === 'Todos' && (
                <div className="px-4 py-3 text-sm text-text-secondary text-center w-full">
                  {t('songbook.noSongs')}
                </div>
              )}
            </div>
          </div>
        )}
        
        {isAdmin && (
          <div className="pt-4 border-t border-border-color mt-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-jumas-green/10 text-jumas-green hover:bg-jumas-green hover:text-white rounded-xl transition-all font-bold shadow-sm"
            >
              <Plus size={20} />
              {t('songbook.newSong')}
            </button>
          </div>
        )}
      </div>

      {/* Song List */}
      <div className={`md:w-80 bg-bg-elevated md:rounded-3xl md:border border-border-color md:shadow-sm flex flex-col ${selectedSongId || selectedArtistProfileId || isTunerActive || isPdfActive ? 'hidden md:flex' : 'flex'} flex-1 md:flex-none overflow-hidden relative`}>
        <div className="p-4 border-b border-border-color bg-bg-elevated">
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isGlobalSearchActive ? t('songbook.searchSongArtist') : t('songbook.searchSongNumber')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-2xl md:rounded-xl py-3 md:py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all text-sm md:text-base"
            />
            <div className="absolute right-0 top-0 h-full px-4 flex items-center text-text-secondary">
              <Search size={18} />
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar bg-bg-secondary/10">
          <AnimatePresence mode="popLayout">
            {isGlobalSearchActive && !searchQuery && topSongs.length > 0 && (
              <div className="mb-8">
                <h3 className="px-4 py-2 text-lg font-black text-text-primary tracking-tight">{t('songbook.topSongs')}</h3>
                <motion.ul className="flex flex-col gap-1">
                  {topSongs.map((song, index) => (
                    <motion.li 
                      key={`top-${song.id}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <button
                        onClick={() => {
                          setSelectedSongId(song.id);
                          setIsPdfActive(false);
                          setIsTunerActive(false);
                          incrementViewCount(song.id);
                        }}
                        className="w-full text-left px-4 py-3 rounded-2xl hover:bg-bg-secondary transition-all flex items-center gap-4 group"
                      >
                        <span className="text-lg font-bold text-text-secondary w-6 text-center group-hover:text-jumas-green transition-colors">
                          {index + 1}
                        </span>
                        <SongCover 
                          song={song} 
                          artist={artists.find(a => a.id === song.artistId)} 
                          className="w-12 h-12 rounded-xl"
                          iconSize={20}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="block text-base font-bold text-text-primary truncate">{song.title}</span>
                            <ShieldCheck size={14} className="text-blue-500 flex-shrink-0" />
                          </div>
                          <span className="block text-xs text-text-secondary truncate mt-0.5">
                            {(song.artistIds && song.artistIds.length > 0) ? song.artistIds.map(id => artists.find(a => a.id === id)?.name).filter(Boolean).join(', ') : (artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist'))}
                          </span>
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            )}

            {filteredArtists.length > 0 && (
              <div className="mb-4">
                <h3 className="px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">{t('songbook.artists')}</h3>
                <motion.ul className="flex flex-col gap-1.5">
                  {filteredArtists.map((artist, index) => (
                    <motion.li 
                      key={`artist-${artist.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <button
                        onClick={() => {
                          setSelectedArtistProfileId(artist.id);
                          setSelectedSongId(null);
                          setIsPdfActive(false);
                          setIsTunerActive(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-2xl md:rounded-xl transition-all duration-200 border flex items-center gap-3 ${
                          selectedArtistProfileId === artist.id 
                            ? 'bg-jumas-green/10 font-bold text-jumas-green border-jumas-green/20 shadow-sm' 
                            : 'text-text-primary bg-bg-elevated md:bg-transparent hover:bg-bg-secondary border-transparent'
                        }`}
                      >
                        {artist.photoUrl ? (
                          <img src={artist.photoUrl} alt={artist.name} className="w-8 h-8 rounded-full object-cover border border-border-color" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-bg-secondary border border-border-color flex items-center justify-center text-text-secondary">
                            <User size={14} />
                          </div>
                        )}
                        <span className="text-sm md:text-base leading-tight truncate font-medium">{artist.name}</span>
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            )}

            {(filteredSongs.length > 0 || filteredArtists.length > 0) ? (
              <div className="mb-4">
                {filteredArtists.length > 0 && (
                  <h3 className="px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Músicas</h3>
                )}
                <motion.ul className="flex flex-col gap-1.5 pb-32 md:pb-0">
                  {filteredSongs.map((song, index) => (
                    <motion.li 
                      key={`main-list-song-${song.id}-${song.number}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group"
                  >
                    <button
                      onClick={() => {
                        setSelectedSongId(song.id);
                        setIsPdfActive(false);
                        setIsTunerActive(false);
                        incrementViewCount(song.id);
                        showToast(`Abrindo: ${song.title}`, 'info');
                      }}
                      className={`w-full text-left pl-4 pr-24 py-3 rounded-2xl md:rounded-xl transition-all duration-200 border flex items-center gap-4 ${
                        selectedSongId === song.id 
                          ? 'bg-jumas-green/10 font-bold text-jumas-green border-jumas-green/20 shadow-sm' 
                          : 'text-text-primary bg-bg-elevated md:bg-transparent hover:bg-bg-secondary border-transparent'
                      }`}
                    >
                      <SongCover 
                        song={song} 
                        artist={artists.find(a => a.id === song.artistId)} 
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl"
                        iconSize={20}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm md:text-base font-bold text-text-primary truncate">{song.title}</span>
                        <span className="block text-xs text-text-secondary truncate mt-0.5">
                          {(song.artistIds && song.artistIds.length > 0) ? song.artistIds.map(id => artists.find(a => a.id === id)?.name).filter(Boolean).join(', ') : (artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist'))} • {song.category}
                        </span>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(song.id);
                        }}
                        className={`p-2 transition-colors ${song.isFavorite ? 'text-red-500' : 'text-text-secondary hover:text-red-500'}`}
                        title={song.isFavorite ? t('songbook.removeFromFavorites') : t('songbook.addToFavorites')}
                      >
                        <Heart size={18} fill={song.isFavorite ? "currentColor" : "none"} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSongToDelete({ id: song.id, title: song.title });
                          }}
                          className={`p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 ${selectedSongId === song.id ? 'opacity-100' : ''}`}
                          aria-label={t('songbook.deleteSong')}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
                </motion.ul>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center text-text-secondary flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Music size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium mb-4">{t('songbook.noSongsFound')}</p>
                {activeSongbook?.pdfUrl && (
                  <button
                    onClick={() => {
                      setIsPdfActive(true);
                      setSelectedSongId(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-jumas-green text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md shadow-jumas-green/20"
                  >
                    <FileText size={18} />
                    {t('songbook.viewOriginalPdf')}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Song Details */}
      <div className={`flex-1 bg-bg-elevated md:rounded-3xl md:border border-border-color md:shadow-sm flex flex-col overflow-hidden ${!selectedSongId && !isPdfActive && !selectedArtistProfileId ? 'hidden md:flex' : 'flex'} h-full pb-16 md:pb-0`}>
        <AnimatePresence mode="wait">
          {isPdfActive && activeSongbook?.pdfUrl ? (
            <motion.div
              key="pdf-viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                  <button 
                    className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                    onClick={() => setIsPdfActive(false)}
                    title={t('common.back')}
                  >
                    <ChevronLeft size={24} />
                    <span className="hidden md:inline font-bold text-sm">{t('common.back')}</span>
                  </button>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {t('pdf.title')}
                      </span>
                    </div>
                    <h2 className="font-bold text-lg md:text-2xl text-text-primary tracking-tight truncate">{activeSongbook.name}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPdfActive(false)}
                  className="px-4 py-2 bg-bg-secondary text-text-primary hover:bg-jumas-green hover:text-white rounded-xl transition-all font-bold text-sm"
                >
                  {t('songbook.backToChords')}
                </button>
              </div>
              <div className="flex-1 bg-bg-secondary/20 relative min-h-[500px]">
                <PdfViewer base64Url={activeSongbook.pdfUrl} />
              </div>
            </motion.div>
          ) : selectedSong ? (
            <motion.div 
              key={selectedSong.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full relative"
            >
              <div className="p-3 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden w-full md:flex-1">
                  <button 
                    className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 flex-shrink-0"
                    onClick={() => {
                      setSelectedSongId(null);
                      if (wasInLists) {
                        setIsListsActive(true);
                        setWasInLists(false);
                      }
                    }}
                    title="Voltar"
                  >
                    <ChevronLeft size={24} />
                    <span className="hidden md:inline font-bold text-sm">Voltar</span>
                  </button>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                        #{selectedSong.number}
                      </span>
                      <span className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-widest truncate">
                        {(selectedSong.artistIds && selectedSong.artistIds.length > 0) ? selectedSong.artistIds.map(id => artists.find(a => a.id === id)?.name).filter(Boolean).join(', ') : (artists.find(a => a.id === selectedSong.artistId)?.name || t('songbook.unknownArtist'))} • {selectedSong.category}
                      </span>
                    </div>
                    <h2 className="font-bold text-base md:text-2xl text-text-primary tracking-tight truncate">{selectedSong.title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                  <div className="flex items-center bg-bg-secondary rounded-xl p-1 mr-1">
                    <button 
                      onClick={() => setShowAutoScrollPanel(!showAutoScrollPanel)}
                      className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${showAutoScrollPanel ? 'bg-jumas-green text-white shadow-md' : 'text-text-secondary hover:text-jumas-green hover:bg-bg-primary'}`}
                      title={showAutoScrollPanel ? t('songbook.hideScrollControls') : t('songbook.showScrollControls')}
                    >
                      <motion.div
                         animate={{ rotate: showAutoScrollPanel ? 180 : 0 }}
                         transition={{ duration: 0.3 }}
                      >
                        <MousePointer2 size={18} />
                      </motion.div>
                    </button>
                    <div className="w-px h-4 bg-border-color mx-1" />
                    <button 
                      onClick={() => setFontSize(prev => Math.max(6, prev - 2))}
                      className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all flex items-center justify-center"
                      title={t('songbook.decreaseFont')}
                    >
                      <Minus size={16} />
                      <Type size={14} className="ml-0.5" />
                    </button>
                    <div className="w-px h-4 bg-border-color mx-1" />
                    <button 
                      onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                      className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all flex items-center justify-center"
                      title={t('songbook.increaseFont')}
                    >
                      <Plus size={16} />
                      <Type size={18} className="ml-0.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSongToAddToPlaylist(selectedSong.id);
                      setIsAddToPlaylistModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl text-text-secondary hover:text-jumas-green hover:bg-bg-secondary transition-all"
                    title={t('playlists.addToList')}
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    onClick={() => toggleFavorite(selectedSong.id)}
                    className={`p-2.5 rounded-xl transition-all ${selectedSong.isFavorite ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title={selectedSong.isFavorite ? t('songbook.removeFromFavorites') : t('songbook.addToFavorites')}
                  >
                    <Heart size={20} fill={selectedSong.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <div className="flex items-center bg-bg-secondary rounded-xl p-1 mr-1 md:mr-2">
                    <button 
                      onClick={handlePrevSong}
                      className="p-1.5 md:p-2 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all"
                      title={t('songbook.previous')}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-px h-4 bg-border-color mx-1" />
                    <button 
                      onClick={handleNextSong}
                      className="p-1.5 md:p-2 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all"
                      title={t('songbook.next')}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setSongToEdit(selectedSong);
                          setIsAddModalOpen(true);
                        }}
                        className="p-2.5 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-xl transition-colors"
                        title="Editar cifra"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => setSongToDelete({ id: selectedSong.id, title: selectedSong.title })}
                        className="p-2.5 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="Excluir cifra"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div 
                ref={scrollContainerRef}
                className="p-5 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-bg-secondary/20 pb-32 md:pb-8"
              >
                <div className="max-w-2xl mx-auto">
                  {selectedArtist && (
                    <button 
                      onClick={() => {
                        setSelectedArtistProfileId(selectedArtist.id);
                        setSelectedSongId(null);
                      }}
                      className="w-full text-left mb-8 p-4 bg-bg-elevated rounded-3xl border border-border-color shadow-sm flex items-start gap-4 hover:border-jumas-green/50 hover:shadow-md transition-all group"
                    >
                      {selectedArtist.photoUrl ? (
                        <img src={selectedArtist.photoUrl} alt={selectedArtist.name} className="w-16 h-16 rounded-full object-cover border-2 border-border-color flex-shrink-0 group-hover:border-jumas-green/30 transition-colors" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-bg-secondary border-2 border-border-color flex items-center justify-center text-text-secondary flex-shrink-0 group-hover:border-jumas-green/30 transition-colors">
                          <User size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-text-primary text-lg group-hover:text-jumas-green transition-colors">{selectedArtist.name}</h3>
                        {selectedArtist.biography && (
                          <p className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">{selectedArtist.biography}</p>
                        )}
                      </div>
                      <div className="self-center text-text-secondary opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={20} />
                      </div>
                    </button>
                  )}
                  
                  {((selectedSong.videoUrls && selectedSong.videoUrls.length > 0) || selectedSong.videoUrl) && (
                    <div className="mb-8 flex flex-col gap-3">
                      {selectedSong.videoUrls && selectedSong.videoUrls.length > 0 ? (
                        selectedSong.videoUrls.map((url: string, index: number) => (
                          <a 
                            key={index}
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-jumas-green/10 text-jumas-green rounded-2xl border border-jumas-green/20 hover:bg-jumas-green/20 transition-all font-bold overflow-hidden relative group"
                          >
                            <SongCover 
                              song={selectedSong} 
                              artist={selectedArtist} 
                              className="w-12 h-12 rounded-xl flex-shrink-0 shadow-sm"
                              iconSize={20}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="block text-sm">
                                {url.includes('spotify.com') ? t('songbook.listenOnSpotify') : 
                                 (url.includes('youtube.com') || url.includes('youtu.be')) ? t('songbook.listenOnYouTube') : 
                                 t('songbook.listenMusic')}
                                {selectedSong.videoUrls.length > 1 ? ` #${index + 1}` : ''}
                              </span>
                              <span className="block text-xs opacity-70 truncate">{url}</span>
                            </div>
                            <ExternalLink size={18} className="flex-shrink-0" />
                          </a>
                        ))
                      ) : (
                        <a 
                          href={selectedSong.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-jumas-green/10 text-jumas-green rounded-2xl border border-jumas-green/20 hover:bg-jumas-green/20 transition-all font-bold overflow-hidden relative group"
                        >
                          <SongCover 
                            song={selectedSong} 
                            artist={selectedArtist} 
                            className="w-12 h-12 rounded-xl flex-shrink-0 shadow-sm"
                            iconSize={20}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm">
                              {selectedSong.videoUrl.includes('spotify.com') ? t('songbook.listenOnSpotify') : 
                               (selectedSong.videoUrl.includes('youtube.com') || selectedSong.videoUrl.includes('youtu.be')) ? t('songbook.listenOnYouTube') : 
                               t('songbook.listenMusic')}
                            </span>
                            <span className="block text-xs opacity-70 truncate">{selectedSong.videoUrl}</span>
                          </div>
                          <ExternalLink size={18} className="flex-shrink-0" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 mb-6 bg-bg-secondary/50 p-1 rounded-2xl border border-border-color/50 overflow-x-auto hide-scrollbar">
                    <button
                      onClick={() => setSongTab('principal')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                        songTab === 'principal' 
                          ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' 
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                      }`}
                    >
                      {t('songbook.tabPrincipal')}
                    </button>
                    {selectedSong.content_simplified && (
                      <button
                        onClick={() => setSongTab('simplified')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                          songTab === 'simplified' 
                            ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' 
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        {t('songbook.tabSimplified')}
                      </button>
                    )}
                    {selectedSong.content_lyrics && (
                      <button
                        onClick={() => setSongTab('lyrics')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                          songTab === 'lyrics' 
                            ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' 
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                        }`}
                      >
                        {t('songbook.tabLyrics')}
                      </button>
                    )}
                  </div>

                  <ChordDiagrams 
                    chords={extractChords(
                      songTab === 'principal' ? selectedSong.content : 
                      songTab === 'simplified' ? selectedSong.content_simplified : 
                      ''
                    )} 

                    highlightedChord={activeChord}
                  />

                  <pre 
                    className="font-mono text-text-primary whitespace-pre leading-relaxed md:leading-loose overflow-x-auto pb-4"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {renderSongContent(
                      songTab === 'principal' ? selectedSong.content : 
                      songTab === 'simplified' ? selectedSong.content_simplified : 
                      selectedSong.content_lyrics || selectedSong.content, 
                      songTab === 'lyrics', 
                      (chord) => setActiveChord(chord)
                    )}
                  </pre>
                </div>
              </div>
            </motion.div>
          ) : selectedArtistProfile ? (
            <motion.div 
              key={`profile-${selectedArtistProfile.id}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                  <button 
                    className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
                    onClick={() => setSelectedArtistProfileId(null)}
                    title={t('songbook.back')}
                  >
                    <ChevronLeft size={24} />
                    <span className="hidden md:inline font-bold text-sm">{t('songbook.back')}</span>
                  </button>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {t('songbook.artistProfile')}
                      </span>
                    </div>
                    <h2 className="font-bold text-lg md:text-2xl text-text-primary tracking-tight truncate">{selectedArtistProfile.name}</h2>
                  </div>
                </div>
              </div>
              <div className="p-5 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-bg-secondary/20 pb-32 md:pb-8">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-8 flex flex-col items-center text-center">
                    {selectedArtistProfile.photoUrl ? (
                      <img src={selectedArtistProfile.photoUrl} alt={selectedArtistProfile.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-bg-elevated shadow-lg mb-4" />
                    ) : (
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-bg-elevated border-4 border-bg-secondary shadow-lg flex items-center justify-center text-text-secondary mb-4">
                        <User size={40} className="md:hidden" />
                        <User size={48} className="hidden md:block" />
                      </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">{selectedArtistProfile.name}</h1>
                    {selectedArtistProfile.biography && (
                      <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-lg">{selectedArtistProfile.biography}</p>
                    )}
                  </div>
                  
                  <div className="mt-12">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                      <Music size={20} className="text-jumas-green" />
                      {t('songbook.songsBy', { name: selectedArtistProfile.name })}
                    </h3>
                    <div className="bg-bg-elevated rounded-3xl border border-border-color overflow-hidden shadow-sm">
                      {songs.filter(s => s.artistId?.toString() === selectedArtistProfile.id.toString()).length > 0 ? (
                        <ul className="divide-y divide-border-color">
                          {songs.filter(s => s.artistId?.toString() === selectedArtistProfile.id.toString()).map((song, index) => (
                            <li key={`${song.id}-${index}`}>
                              <button
                                onClick={() => {
                                  setSelectedSongId(song.id);
                                  setSelectedArtistProfileId(null);
                                  setIsTunerActive(false);
                                }}
                                className="w-full text-left px-6 py-4 hover:bg-bg-secondary transition-colors flex items-center justify-between group gap-4"
                              >
                                <SongCover 
                                  song={song} 
                                  artist={selectedArtistProfile} 
                                  className="w-10 h-10 rounded-lg flex-shrink-0"
                                  iconSize={20}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-text-primary block truncate">{song.title}</span>
                                  <span className="text-xs text-text-secondary mt-1 block truncate">{songbooks.find(sb => sb.id === song.songbookId)?.name}</span>
                                </div>
                                <ChevronRight size={18} className="text-text-secondary opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-text-secondary text-sm">
                          {t('songbook.noSongsByArtist')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !selectedSongId ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center text-text-secondary p-8 text-center"
            >
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Music size={32} className="text-text-secondary opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">{t('songbook.selectSong')}</h3>
                <p className="text-sm text-text-secondary">{t('songbook.selectSongDesc')}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {renderModals()}
      </div>
      <BottomNav />

      {/* Auto-scroll controls - Now optional via showAutoScrollPanel */}
      <AnimatePresence>
        {selectedSong && !isPdfActive && showAutoScrollPanel && (
            <motion.div 
              initial={{ y: 100, x: '-50%', opacity: 0 }}
              animate={{ 
                y: 0, 
                x: '-50%', 
                opacity: 1,
                boxShadow: isAutoScrolling 
                  ? ['0 10px 40px -10px rgba(74, 222, 128, 0.2)', '0 10px 40px -10px rgba(74, 222, 128, 0.5)', '0 10px 40px -10px rgba(74, 222, 128, 0.2)']
                  : '0 10px 40px -10px rgba(0, 0, 0, 0.3)'
              }}
              transition={{ 
                opacity: { duration: 0.3 },
                y: { type: 'spring', damping: 20, stiffness: 100 },
                boxShadow: { repeat: Infinity, duration: 2 }
              }}
              exit={{ y: 100, x: '-50%', opacity: 0 }}
              className={`fixed bottom-24 md:bottom-10 left-1/2 bg-bg-elevated/95 backdrop-blur-xl border-2 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 z-[100] transition-colors duration-500 ${isAutoScrolling ? 'border-jumas-green/50' : 'border-border-color'}`}
            >
            <div className="flex items-center gap-3 pr-4 border-r border-border-color">
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-[10px] font-bold text-jumas-green uppercase tracking-widest leading-none mb-1">{t('songbook.autoScroll')}</span>
                <span className="text-[9px] text-text-secondary font-medium uppercase leading-none">{isAutoScrolling ? t('songbook.scrollActive') : t('songbook.scrollPaused')}</span>
              </div>
              <button 
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`p-3 rounded-full ${isAutoScrolling ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' : 'bg-bg-secondary text-text-primary'} hover:scale-110 active:scale-95 transition-all`}
                title={isAutoScrolling ? t('songbook.stopScroll') : t('songbook.startScroll')}
              >
                {isAutoScrolling ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-start hidden sm:flex mr-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">{t('songbook.speed')}</span>
                <span className="text-[9px] text-text-secondary font-medium uppercase leading-none">{scrollSpeed}%</span>
              </div>
              <button 
                onClick={() => setScrollSpeed(Math.max(1, scrollSpeed - 10))}
                className="p-1.5 text-text-secondary hover:text-jumas-green transition-colors"
                title={t('songbook.decreaseSpeed')}
              >
                <Rewind size={18} />
              </button>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-24 md:w-32 h-1.5 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-jumas-green"
              />
              <button 
                onClick={() => setScrollSpeed(Math.min(100, scrollSpeed + 10))}
                className="p-1.5 text-text-secondary hover:text-jumas-green transition-colors"
                title={t('songbook.increaseSpeed')}
              >
                <FastForward size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </>
  );
};
