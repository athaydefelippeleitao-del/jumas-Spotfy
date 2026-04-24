import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DeleteCategoryConfirmModal } from './DeleteCategoryConfirmModal';
import { EditCategoryConfirmModal } from './EditCategoryConfirmModal';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onUpdateCategories: (newCategories: string[]) => void;
  songs: any[];
  onUpdateSongs: (newSongs: any[]) => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
  songs,
  onUpdateSongs
}) => {
  const { t } = useTranslation();
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<{index: number, name: string, songCount: number} | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<{index: number, oldName: string, newName: string, songCount: number} | null>(null);

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setError(t('categories.alreadyExists'));
      return;
    }
    onUpdateCategories([...categories, trimmed]);
    setNewCategory('');
    setError('');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(categories[index]);
    setError('');
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed) && trimmed !== categories[index]) {
      setError(t('categories.alreadyExists'));
      return;
    }

    if (trimmed === categories[index]) {
      setEditingIndex(null);
      setEditValue('');
      setError('');
      return;
    }

    const oldName = categories[index];
    const songsInCategory = songs.filter(s => s.category === oldName);
    
    setCategoryToEdit({
      index,
      oldName,
      newName: trimmed,
      songCount: songsInCategory.length
    });
  };

  const confirmEdit = () => {
    if (!categoryToEdit) return;
    const { index, oldName, newName } = categoryToEdit;

    const newCategories = [...categories];
    newCategories[index] = newName;
    onUpdateCategories(newCategories);

    // Update all songs with this category
    const newSongs = songs.map(song => 
      song.category === oldName ? { ...song, category: newName } : song
    );
    onUpdateSongs(newSongs);

    setEditingIndex(null);
    setEditValue('');
    setError('');
    setCategoryToEdit(null);
  };

  const handleDeleteClick = (index: number) => {
    const categoryName = categories[index];
    const songsInCategory = songs.filter(s => s.category === categoryName);
    setCategoryToDelete({ index, name: categoryName, songCount: songsInCategory.length });
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    const { index, name, songCount } = categoryToDelete;

    const newCategories = categories.filter((_, i) => i !== index);
    onUpdateCategories(newCategories);

    // Update songs to "Sem Categoria" or similar
    const newSongs = songs.map(song => 
      song.category === name ? { ...song, category: t('categories.none') } : song
    );
    onUpdateSongs(newSongs);
    
    // Ensure "Sem Categoria" exists if it was used
    if (songCount > 0 && !newCategories.includes(t('categories.none'))) {
      onUpdateCategories([...newCategories, t('categories.none')]);
    }
    setCategoryToDelete(null);
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
            className="relative w-full max-w-md bg-bg-elevated rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-elevated sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t('categories.manage')}</h2>
                <p className="text-xs text-text-secondary mt-1">{t('categories.manageDesc')}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-bg-secondary rounded-full text-text-secondary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={t('categories.newPlaceholder')}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-jumas-green/50 transition-all"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!newCategory.trim()}
                  className="bg-jumas-green text-white p-2.5 rounded-xl hover:bg-jumas-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-jumas-green/20"
                >
                  <Plus size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {categories.map((cat, index) => (
                  <div 
                    key={`${cat}-${index}`}
                    className="flex items-center gap-2 p-3 bg-bg-secondary/50 rounded-xl border border-border-color/50 group hover:border-jumas-green/30 transition-all"
                  >
                    {editingIndex === index ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(index)}
                          className="flex-1 bg-bg-elevated border border-jumas-green rounded-lg py-1 px-3 text-sm focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveEdit(index)}
                          className="p-1.5 text-jumas-green hover:bg-jumas-green/10 rounded-lg transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="p-1.5 text-text-secondary hover:bg-bg-secondary rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-text-primary">{cat}</span>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-lg transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(index)}
                            className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border-color bg-bg-secondary/30">
              <button
                onClick={onClose}
                className="w-full py-3 bg-bg-elevated border border-border-color rounded-xl text-sm font-bold text-text-primary hover:bg-bg-secondary transition-all"
              >
                {t('common.finish')}
              </button>
            </div>
          </motion.div>

          <DeleteCategoryConfirmModal
            isOpen={!!categoryToDelete}
            onClose={() => setCategoryToDelete(null)}
            onConfirm={confirmDelete}
            categoryName={categoryToDelete?.name || ''}
            songCount={categoryToDelete?.songCount || 0}
          />

          <EditCategoryConfirmModal
            isOpen={!!categoryToEdit}
            onClose={() => setCategoryToEdit(null)}
            onConfirm={confirmEdit}
            oldCategoryName={categoryToEdit?.oldName || ''}
            newCategoryName={categoryToEdit?.newName || ''}
            songCount={categoryToEdit?.songCount || 0}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
