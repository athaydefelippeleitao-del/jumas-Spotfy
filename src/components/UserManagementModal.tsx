import React, { useState, useEffect, useMemo } from 'react';
import { X, User as UserIcon, Shield, ShieldAlert, Loader2, Edit2, Check, Mail, MapPin, Calendar, Camera, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  username: string;
  email?: string;
  name: string;
  role: 'admin' | 'user';
  last_active: string;
  city?: string;
  age?: number;
  photoUrl?: string;
  password?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfirmState {
  user: User;
  newRole: 'admin' | 'user';
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(t('common.imageSizeError'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const isOnline = (lastActive: string) => {
    if (!lastActive) return false;
    const lastActiveDate = new Date(lastActive); // Supabase returns full ISO with timezone
    if (isNaN(lastActiveDate.getTime())) return false;
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const formatLastActive = (lastActive: string) => {
    if (!lastActive) return t('users.neverActive');
    const lastActiveDate = new Date(lastActive);
    if (isNaN(lastActiveDate.getTime())) return t('users.neverActive');
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('users.now');
    if (diffInMinutes < 60) return t('users.minutesAgo', { count: diffInMinutes });
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('users.hoursAgo', { count: diffInHours });

    // Show date and time for older entries
    return lastActiveDate.toLocaleString(i18n.language === 'es' ? 'es-ES' : 'pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/users/${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
        alert(t('users.deleteUserSuccess'));
      } else {
        const data = await res.json();
        alert(data.error || t('common.deleteError'));
      }
    } catch {
      alert(t('common.connError'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleRole = async () => {
    if (!confirmState) return;
    
    const { user, newRole } = confirmState;
    setConfirmState(null);
    setUpdatingId(user.id);
    
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      } else {
        const errorData = await res.json();
        alert(`${t('common.updateError')} ${t('users.role').toLowerCase()}: ${errorData.error || t('common.unknownError')}`);
      }
    } catch (error) {
      console.error('Failed to toggle user role', error);
      alert(t('common.connError'));
    } finally {
      setUpdatingId(null);
    }
  };

  const openConfirm = (user: User) => {
    if (user.id === currentUser?.id) {
      alert(t('users.cannotSelfDemote'));
      return;
    }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setConfirmState({ user, newRole });
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleUpdate = async (id: number, data: Partial<User>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
        setEditingId(null);
      } else {
        const errorData = await res.json();
        alert(`${t('common.updateError')} ${t('profile.user').toLowerCase()}: ${errorData.error || t('common.unknownError')}`);
      }
    } catch (error) {
      console.error('Failed to update user', error);
      alert(t('common.connError'));
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditForm({ ...user, password: '' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl bg-bg-elevated rounded-3xl shadow-2xl overflow-hidden border border-border-color flex flex-col max-h-[85vh] sm:max-h-[70vh]"
        >
          <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-secondary/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jumas-green/10 text-jumas-green rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">{t('users.manage')}</h2>
                <p className="text-xs text-text-secondary">{t('users.description')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {!loading && (
              <div className="mb-6 sticky top-0 z-10 bg-bg-elevated/80 backdrop-blur-md pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    type="text"
                    placeholder={t('users.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-bg-secondary/80 border border-border-color rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all placeholder:text-text-secondary/50"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="animate-spin text-jumas-green" size={40} />
                <p className="text-text-secondary font-medium">{t('common.loading')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">{t('users.noUsersFound', { query: searchQuery })}</p>
                  </div>
                ) : (
                  filteredUsers.map((user, index) => (
                    <div
                      key={`${user.id}-${index}`}
                      className="flex flex-col p-4 bg-bg-secondary/30 rounded-2xl border border-border-color/50 hover:border-jumas-green/30 transition-all group gap-4"
                    >
                      {editingId === user.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('common.name')}</label>
                              <input
                                type="text"
                                value={editForm.name || ''}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('profile.username')}</label>
                              <input
                                type="text"
                                value={editForm.username || ''}
                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('profile.email')}</label>
                              <input
                                type="email"
                                value={editForm.email || ''}
                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('profile.city')}</label>
                              <input
                                type="text"
                                value={editForm.city || ''}
                                onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('profile.age')}</label>
                              <input
                                type="number"
                                value={editForm.age || ''}
                                onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">{t('users.role')}</label>
                              <select
                                value={editForm.role}
                                onChange={e => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              >
                                <option value="user">{t('users.role_user')}</option>
                                <option value="admin">{t('users.role_admin')}</option>
                              </select>
                            </div>
                            <div className="space-y-1 sm:col-span-3">
                              <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Senha</label>
                              <input
                                type="password"
                                placeholder={t('profile.passwordPlaceholder')}
                                value={editForm.password || ''}
                                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[10px] font-bold text-text-secondary uppercase">{t('users.userPhoto')}</label>
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-[9px] font-bold text-jumas-green uppercase hover:underline"
                              >
                                {t('profile.upload')}
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated border border-border-color flex-shrink-0 cursor-pointer hover:border-jumas-green transition-colors"
                              >
                                {editForm.photoUrl ? (
                                  <img src={editForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                    <Camera size={16} />
                                  </div>
                                )}
                              </div>
                              <input
                                type="text"
                                value={editForm.photoUrl || ''}
                                onChange={e => setEditForm({ ...editForm, photoUrl: e.target.value })}
                                placeholder={t('users.photoPlaceholder')}
                                className="flex-1 bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                              />
                            </div>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handlePhotoUpload} 
                              accept="image/*" 
                              className="hidden" 
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-xs font-bold text-text-secondary hover:bg-bg-secondary rounded-xl transition-all"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={() => handleUpdate(user.id, editForm)}
                              disabled={updatingId === user.id}
                              className="px-4 py-2 text-xs font-bold bg-jumas-green text-white rounded-xl hover:bg-jumas-green/90 transition-all flex items-center gap-2"
                            >
                              {updatingId === user.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                              {t('common.save')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${user.role === 'admin' ? 'bg-jumas-green/10 text-jumas-green' : 'bg-bg-secondary text-text-secondary'}`}>
                                  {user.photoUrl ? (
                                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserIcon size={24} />
                                  )}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-bg-elevated ${isOnline(user.last_active) ? 'bg-green-500' : 'bg-gray-400'}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-text-primary truncate">{user.name}</h3>
                                  {isOnline(user.last_active) && (
                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider flex-shrink-0">{t('users.online')}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <p className="text-sm text-text-secondary truncate flex items-center gap-1">
                                    <UserIcon size={12} /> {user.username}
                                  </p>
                                  {user.email && (
                                    <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                      <Mail size={12} /> {user.email}
                                    </p>
                                  )}
                                  {user.city && (
                                    <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                      <MapPin size={12} /> {user.city}
                                    </p>
                                  )}
                                  {user.age && (
                                    <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                      <Calendar size={12} /> {user.age} {t('users.years')}
                                    </p>
                                  )}
                                </div>
                                <p className="text-[10px] text-text-secondary/60 mt-0.5">
                                  {t('users.lastSeenSimple')} {formatLastActive(user.last_active)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border-color/30">
                              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' 
                                  ? 'bg-jumas-green/10 text-jumas-green' 
                                  : 'bg-bg-secondary text-text-secondary'
                              }`}>
                                {user.role === 'admin' ? t('users.role_admin') : t('users.role_user')}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditing(user)}
                                  className="p-2 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-xl transition-all"
                                  title={t('users.edit')}
                                >
                                  <Edit2 size={20} />
                                </button>
                                <button
                                  onClick={() => openConfirm(user)}
                                  disabled={updatingId === user.id}
                                  className={`p-2 rounded-xl transition-all ${
                                    user.role === 'admin'
                                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                      : 'text-jumas-green hover:bg-jumas-green/10'
                                  }`}
                                  title={user.role === 'admin' ? t('users.removePrivileges') : t('users.makeAdmin')}
                                >
                                  {updatingId === user.id ? (
                                    <Loader2 className="animate-spin" size={20} />
                                  ) : user.role === 'admin' ? (
                                    <ShieldAlert size={20} />
                                  ) : (
                                    <Shield size={20} />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (user.id === currentUser?.id) {
                                      alert(t('users.cannotDeleteSelf'));
                                      return;
                                    }
                                    setDeleteConfirm(user);
                                  }}
                                  disabled={deletingId === user.id}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                  title={t('users.deleteUser')}
                                >
                                  {deletingId === user.id ? (
                                    <Loader2 className="animate-spin" size={20} />
                                  ) : (
                                    <Trash2 size={20} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-bg-secondary/30 border-t border-border-color text-center">
            <p className="text-xs text-text-secondary">
              {t('users.footer')}
            </p>
          </div>
        </motion.div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmState && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                className="w-full max-w-sm bg-bg-elevated rounded-3xl shadow-2xl p-6 border border-border-color"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`p-4 rounded-2xl ${confirmState.newRole === 'admin' ? 'bg-jumas-green/10 text-jumas-green' : 'bg-red-500/10 text-red-500'}`}>
                    {confirmState.newRole === 'admin' ? <Shield size={32} /> : <ShieldAlert size={32} />}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {confirmState.newRole === 'admin' ? t('users.promote') : t('users.demote')}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {confirmState.newRole === 'admin' 
                        ? t('users.promoteDescription', { name: confirmState.user.name })
                        : t('users.demoteDescription', { name: confirmState.user.name })}
                    </p>
                  </div>

                  <div className="flex flex-col w-full gap-2 mt-2">
                    <button
                      onClick={handleToggleRole}
                      className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${
                        confirmState.newRole === 'admin'
                          ? 'bg-jumas-green text-white hover:bg-jumas-green/90'
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                    >
                      {confirmState.newRole === 'admin' ? t('users.confirmPromote') : t('users.confirmDemote')}
                    </button>
                    <button
                      onClick={() => setConfirmState(null)}
                      className="w-full py-3 rounded-2xl font-bold text-sm text-text-secondary hover:bg-bg-secondary transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete User Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                className="w-full max-w-sm bg-bg-elevated rounded-3xl shadow-2xl p-6 border border-border-color"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-2xl bg-red-500/10 text-red-500">
                    <Trash2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{t('users.deleteUser')}</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {t('users.deleteUserConfirm', { name: deleteConfirm.name })}
                    </p>
                  </div>
                  <div className="flex flex-col w-full gap-2 mt-2">
                    <button
                      onClick={handleDeleteUser}
                      className="w-full py-3 rounded-2xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all"
                    >
                      {t('common.delete')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="w-full py-3 rounded-2xl font-bold text-sm text-text-secondary hover:bg-bg-secondary transition-all"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
