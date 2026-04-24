import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Image as ImageIcon, Camera, RotateCcw, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as JSZip from 'jszip';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingImageUrl, setLoadingImageUrl] = useState('');
  const [appIconUrl, setAppIconUrl] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const loadingFileInputRef = useRef<HTMLInputElement>(null);
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [loadingRes, iconRes] = await Promise.all([
        fetch('/api/settings/loading-image'),
        fetch('/api/settings/app-icon')
      ]);
      
      if (loadingRes.ok) {
        const data = await loadingRes.json();
        setLoadingImageUrl(data.url);
      }
      
      if (iconRes.ok) {
        const data = await iconRes.json();
        setAppIconUrl(data.url);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const [loadingRes, iconRes] = await Promise.all([
        fetch('/api/settings/loading-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: loadingImageUrl })
        }),
        fetch('/api/settings/app-icon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: appIconUrl })
        })
      ]);

      if (loadingRes.ok && iconRes.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setTimeout(() => onClose(), 1500);
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar algumas configurações' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'loading' | 'icon') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'loading') {
          setLoadingImageUrl(reader.result as string);
        } else {
          setAppIconUrl(reader.result as string);
        }
        setMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetLoadingToDefault = () => {
    setLoadingImageUrl('https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1');
  };

  const resetIconToDefault = () => {
    setAppIconUrl('https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1');
  };

  const handleBackup = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        
        console.log("Generating ZIP backup...");
        const JSZipConstructor = (JSZip as any).default || JSZip;
        const zip = new JSZipConstructor();
        zip.file("data.json", JSON.stringify(data, null, 2));
        zip.file("readme.txt", "Backup do Jumas Cifras\nGerado em: " + new Date().toLocaleString());
        
        const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jumas-backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Backup (.zip) gerado com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao gerar backup no servidor' });
      }
    } catch (error) {
      console.error("Backup error:", error);
      setMessage({ type: 'error', text: 'Erro de conexão ao gerar backup' });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setPendingFile(file);
    setShowConfirmRestore(true);
    // Reset input so the same file can be selected again if cancelled
    if (e.target) e.target.value = '';
  };

  const cancelRestore = () => {
    setPendingFile(null);
    setShowConfirmRestore(false);
  };

  const executeRestore = async () => {
    if (!pendingFile) return;
    
    const file = pendingFile;
    setPendingFile(null);
    setShowConfirmRestore(false);
    
    setSaving(true);
    setMessage({ type: 'success', text: 'Iniciando restauração...' });
    const fileName = file.name.toLowerCase();
    console.log("RESTORE DEBUG: Selected file:", file.name, "Size:", file.size, "Type:", file.type);

    try {
      let jsonData: any = null;

      if (fileName.endsWith('.zip')) {
        setMessage({ type: 'success', text: 'Lendo arquivo ZIP...' });
        console.log("RESTORE DEBUG: Processing ZIP file with JSZip...");
        
        // Handle different import styles for JSZip
        const JSZipConstructor = (JSZip as any).default || JSZip;
        const zip = new JSZipConstructor();
        let zipContent;
        
        try {
          // Use ArrayBuffer for better compatibility
          const arrayBuffer = await file.arrayBuffer();
          console.log("RESTORE DEBUG: File converted to ArrayBuffer, size:", arrayBuffer.byteLength);
          zipContent = await zip.loadAsync(arrayBuffer);
          console.log("RESTORE DEBUG: ZIP loaded successfully. Files found:", Object.keys(zipContent.files));
        } catch (zipErr: any) {
          console.error("RESTORE DEBUG: Error loading ZIP:", zipErr);
          throw new Error(`Não foi possível abrir o arquivo ZIP: ${zipErr.message}`);
        }

        setMessage({ type: 'success', text: 'Procurando data.json...' });
        // Search for data.json anywhere in the zip
        const dataFile = Object.values(zipContent.files).find((f: any) => f.name.toLowerCase().endsWith("data.json") && !f.dir);
        
        if (!dataFile) {
          const files = Object.keys(zipContent.files).join(", ");
          console.error("RESTORE DEBUG: data.json not found. Files in ZIP:", files);
          throw new Error(`Arquivo data.json não encontrado dentro do ZIP. Arquivos encontrados: ${files || 'Nenhum'}`);
        }
        
        console.log(`RESTORE DEBUG: Found data file: ${(dataFile as any).name}`);
        setMessage({ type: 'success', text: 'Extraindo JSON...' });
        const content = await (dataFile as any).async("string");
        
        try {
          jsonData = JSON.parse(content);
          console.log("RESTORE DEBUG: JSON parsed successfully from ZIP");
        } catch (parseErr: any) {
          console.error("RESTORE DEBUG: Error parsing JSON from ZIP:", parseErr);
          throw new Error(`O arquivo data.json dentro do ZIP não é um JSON válido: ${parseErr.message}`);
        }
      } else if (fileName.endsWith('.json')) {
        setMessage({ type: 'success', text: 'Lendo arquivo JSON...' });
        console.log("RESTORE DEBUG: Processing JSON file...");
        const content = await file.text();
        try {
          jsonData = JSON.parse(content);
          console.log("RESTORE DEBUG: JSON parsed successfully");
        } catch (parseErr: any) {
          console.error("RESTORE DEBUG: Error parsing JSON file:", parseErr);
          throw new Error(`O arquivo não é um JSON válido: ${parseErr.message}`);
        }
      } else {
        throw new Error("Formato de arquivo não suportado. Use .json ou .zip");
      }

      if (!jsonData) throw new Error("Dados de backup vazios ou inválidos.");

      setMessage({ type: 'success', text: 'Enviando para o servidor...' });
      console.log("RESTORE DEBUG: Sending data to /api/restore...");
      
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      if (res.ok) {
        console.log("RESTORE DEBUG: Server responded with success");
        setMessage({ type: 'success', text: 'Backup restaurado com sucesso! Recarregue a página.' });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
        console.error("RESTORE DEBUG: Server error:", errorData);
        setMessage({ type: 'error', text: `Erro no servidor: ${errorData.error || errorData.details || 'Erro desconhecido'}` });
      }
    } catch (error: any) {
      console.error("RESTORE DEBUG: Client-side error:", error);
      setMessage({ type: 'error', text: `Erro: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg bg-bg-elevated rounded-3xl shadow-2xl border border-border-color overflow-hidden"
        >
          <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jumas-green/10 text-jumas-green rounded-xl">
                <ImageIcon size={20} />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Configurações do App</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
            <AnimatePresence>
              {showConfirmRestore && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-50 bg-bg-elevated/95 backdrop-blur-md p-8 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Confirmar Restauração?</h3>
                  <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                    Você está prestes a restaurar o backup: <br/>
                    <span className="font-bold text-text-primary">{pendingFile?.name}</span><br/><br/>
                    <span className="text-red-500 font-bold">AVISO:</span> Isso substituirá todos os dados atuais (músicas, artistas, cancioneiros) pelos dados do backup. Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={cancelRestore}
                      className="flex-1 py-3 bg-bg-secondary text-text-primary font-bold rounded-xl hover:bg-bg-secondary/80 transition-all border border-border-color"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={executeRestore}
                      className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Confirmar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-jumas-green" size={32} />
                <p className="text-sm text-text-secondary">Carregando configurações...</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-8">
                {message && (
                  <div className={`p-4 rounded-2xl text-sm font-medium ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Loading Image Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-widest">Imagem de Carregamento</label>
                    <button 
                      type="button"
                      onClick={resetLoadingToDefault}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary hover:text-jumas-green uppercase transition-colors"
                    >
                      <RotateCcw size={12} />
                      Padrão
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-6 p-6 bg-bg-secondary/30 rounded-3xl border border-border-color border-dashed">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-jumas-green/30 shadow-xl bg-bg-secondary flex items-center justify-center">
                        {loadingImageUrl ? (
                          <img 
                            src={loadingImageUrl} 
                            alt="Loading Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon size={40} className="text-text-secondary opacity-20" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => loadingFileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-white"
                      >
                        <Camera size={24} />
                      </button>
                    </div>

                    <div className="w-full space-y-3">
                      <input 
                        type="file" 
                        ref={loadingFileInputRef} 
                        onChange={(e) => handlePhotoUpload(e, 'loading')} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                        <input
                          type="text"
                          value={loadingImageUrl}
                          onChange={(e) => setLoadingImageUrl(e.target.value)}
                          placeholder="URL da imagem ou base64"
                          className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-text-secondary text-center leading-relaxed font-medium">
                        Esta imagem aparecerá para todos os usuários durante o carregamento inicial do aplicativo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* App Icon Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-widest">Ícone do App (Capa de Download)</label>
                    <button 
                      type="button"
                      onClick={resetIconToDefault}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary hover:text-jumas-green uppercase transition-colors"
                    >
                      <RotateCcw size={12} />
                      Padrão
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-bg-secondary/30 rounded-3xl border border-border-color border-dashed">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-jumas-green/30 shadow-xl bg-bg-secondary flex items-center justify-center">
                          {appIconUrl ? (
                            <img 
                              src={appIconUrl} 
                              alt="App Icon Preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ImageIcon size={32} className="text-text-secondary opacity-20" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => iconFileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white"
                        >
                          <Camera size={20} />
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={iconFileInputRef} 
                        onChange={(e) => handlePhotoUpload(e, 'icon')} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <p className="text-[10px] text-text-secondary text-center font-medium">
                        Ícone que aparecerá na tela inicial do celular.
                      </p>
                    </div>

                    {/* Mobile Preview */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-[120px] h-[220px] bg-black rounded-[2rem] p-1.5 border-2 border-border-color relative shadow-2xl overflow-hidden">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
                        <div className="w-full h-full bg-gradient-to-b from-blue-400 to-purple-500 rounded-[1.8rem] relative p-4">
                          {/* Mock App Icons */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="aspect-square bg-white/20 rounded-lg" />
                            <div className="aspect-square bg-white/20 rounded-lg" />
                            <div className="aspect-square bg-white/20 rounded-lg" />
                            
                            {/* Our App Icon */}
                            <div className="flex flex-col items-center gap-1">
                              <div className="aspect-square w-full rounded-lg overflow-hidden shadow-lg border border-white/30">
                                {appIconUrl ? (
                                  <img src={appIconUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full bg-jumas-green" />
                                )}
                              </div>
                              <div className="w-6 h-1 bg-white/40 rounded-full" />
                            </div>
                            
                            <div className="aspect-square bg-white/20 rounded-lg" />
                            <div className="aspect-square bg-white/20 rounded-lg" />
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Preview no Celular</span>
                    </div>
                  </div>

                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                    <input
                      type="text"
                      value={appIconUrl}
                      onChange={(e) => setAppIconUrl(e.target.value)}
                      placeholder="URL do ícone ou base64"
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Backup & Restore Section */}
                <div className="space-y-4 pt-6 border-t border-border-color">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-widest">Backup & Restauração</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleBackup}
                      className="flex items-center justify-center gap-2 p-4 bg-bg-secondary hover:bg-bg-secondary/80 border border-border-color rounded-2xl transition-all text-text-primary"
                    >
                      <Download size={20} className="text-jumas-green" />
                      <div className="text-left">
                        <span className="block text-sm font-bold">Fazer Backup</span>
                        <span className="block text-[10px] text-text-secondary">Baixar arquivo .zip compactado</span>
                      </div>
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        ref={restoreFileInputRef}
                        accept=".json,.zip"
                        onChange={handleRestoreClick}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => restoreFileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-bg-secondary hover:bg-bg-secondary/80 border border-border-color rounded-2xl transition-all text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <Loader2 size={20} className="text-blue-500 animate-spin" />
                        ) : (
                          <Upload size={20} className="text-blue-500" />
                        )}
                        <div className="text-left">
                          <span className="block text-sm font-bold">
                            {saving ? 'Restaurando...' : 'Restaurar'}
                          </span>
                          <span className="block text-[10px] text-text-secondary">Importar arquivo .json ou .zip</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-bg-elevated pb-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-4 bg-bg-secondary text-text-primary font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-bg-secondary/80 transition-all border border-border-color"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-[2] bg-jumas-green hover:bg-jumas-green/90 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all shadow-lg shadow-jumas-green/20 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
