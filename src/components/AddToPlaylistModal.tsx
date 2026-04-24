import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, ListMusic } from 'lucide-react';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string | null;
  playlists: any[];
  onAdd: (playlistId: string, songId: string) => void;
  showToast?: (message: string, type?: any) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ isOpen, onClose, songId, playlists, onAdd, showToast }) => {
  if (!songId) return null;

  const handleAdd = (playlistId: string, songId: string) => {
    onAdd(playlistId, songId);
    if (showToast) {
      const playlist = playlists.find(p => p.id === playlistId);
      showToast(`Adicionado à lista: ${playlist?.name || 'Lista'}`);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-bg-elevated rounded-3xl p-6 shadow-2xl border border-border-color overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-primary">Adicionar à lista</h2>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <ListMusic size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Você ainda não criou nenhuma lista.</p>
                </div>
              ) : (
                playlists.map((playlist, index) => (
                  <button
                    key={`${playlist.id}-${index}`}
                    onClick={() => handleAdd(playlist.id, songId)}
                    className="w-full flex items-center gap-4 p-4 bg-bg-secondary/50 hover:bg-jumas-green/10 rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all group text-left"
                  >
                    <div className="w-10 h-10 bg-bg-secondary rounded-xl flex items-center justify-center text-text-secondary group-hover:text-jumas-green transition-colors">
                      <ListMusic size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-text-primary group-hover:text-jumas-green transition-colors">{playlist.name}</h3>
                    </div>
                    <Plus size={20} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border-color">
              <p className="text-xs text-text-secondary text-center">
                Selecione uma lista para adicionar a música.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
