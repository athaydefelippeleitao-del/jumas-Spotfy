import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";

// Supabase Client Initialization
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Cache em memória (server-side) ──────────────────────────────────────────
// Guarda as respostas das APIs principais para evitar round-trips ao Supabase
// a cada request. Invalida automaticamente após o TTL.
interface MemCacheEntry { data: any; expiresAt: number; }
const memCache = new Map<string, MemCacheEntry>();
const MEM_TTL_MS = 2 * 60 * 1000; // 2 minutos

function getCached(key: string): any | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: any, ttl = MEM_TTL_MS) {
  memCache.set(key, { data, expiresAt: Date.now() + ttl });
}
function invalidateCache(...keys: string[]) {
  keys.forEach(k => memCache.delete(k));
}



async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(cookieParser());

  // Global middleware to track activity
  app.use(async (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', decoded.id);
      } catch (e) {
        // Ignore invalid tokens
      }
    }
    next();
  });

  // API routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password, name, adminCode } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      let role = userCount === 0 ? 'admin' : 'user';
      
      if (adminCode === (process.env.ADMIN_REGISTRATION_CODE || "JUMAS_ADMIN")) {
        role = 'admin';
      }

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{ username, email, password: hashedPassword, name, role }])
        .select()
        .single();

      if (error) throw error;
      
      const token = jwt.sign({ id: newUser.id, username, email, name, role }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ user: { id: newUser.id, username, email, name, role } });
    } catch (error: any) {
      if (error.code === "23505") { // Postgres unique violation
        if (error.message.includes("email")) {
          return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        return res.status(400).json({ error: "Nome de usuário já cadastrado" });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, name, role, photoUrl')
        .eq('id', decoded.id)
        .single();
      
      if (error || !user) {
        res.clearCookie("token");
        return res.status(401).json({ error: "Usuário não encontrado" });
      }
      
      res.json({ user });
    } catch (error) {
      res.clearCookie("token");
      res.status(401).json({ error: "Token inválido ou expirado" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) {
      console.log("Admin check failed: No token found");
      return res.status(401).json({ error: "Não autenticado" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        console.log(`Admin check failed: User ID ${decoded.id} not found in database`);
        return res.status(403).json({ error: "Usuário não encontrado" });
      }
      if (user.role !== 'admin') {
        console.log(`Admin check failed: User ${user.username} has role ${user.role}, not admin`);
        return res.status(403).json({ error: "Acesso negado" });
      }
      console.log(`Admin check passed for user: ${user.username}`);
      req.user = decoded;
      next();
    } catch (error) {
      console.log("Admin check failed: Token verification error", error);
      res.status(401).json({ error: "Token inválido" });
    }
  };

  // User management routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, email, name, role, last_active, city, age, photoUrl')
        .order('id', { ascending: false });
      
      if (error) throw error;
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.patch("/api/users/:id", isAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const body = req.body;

    try {
      const { data: existingUser, error: getError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (getError || !existingUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const updates: any = {};
      if (body.username !== undefined) updates.username = body.username;
      if (body.email !== undefined) updates.email = body.email;
      if (body.name !== undefined) updates.name = body.name;
      if (body.role !== undefined) updates.role = body.role;
      if (body.city !== undefined) updates.city = body.city;
      if (body.age !== undefined) updates.age = body.age;
      if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;

      if (updates.role && updates.role !== existingUser.role) {
        console.log(`[ADMIN ACTION] User ${req.user.username} is changing role of user id ${id} from ${existingUser.role} to ${updates.role}`);
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.code === "23505") {
        if (error.message.includes("email")) {
          return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        return res.status(400).json({ error: "Nome de usuário já cadastrado" });
      }
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // Artist management routes
  app.get("/api/artists", async (req, res) => {
    const cached = getCached('artists');
    if (cached) return res.json({ artists: cached });
    try {
      const { data: artists, error } = await supabase.from('artists').select('*');
      if (error) throw error;
      setCache('artists', artists);
      res.json({ artists });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar artistas" });
    }
  });

  app.post("/api/artists", isAdmin, async (req, res) => {
    const { name, photoUrl, biography } = req.body;
    try {
      const { data: artist, error } = await supabase
        .from('artists')
        .insert([{ name, photoUrl, biography }])
        .select()
        .single();
      if (error) throw error;
      invalidateCache('artists');
      res.json({ artist });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar artista" });
    }
  });

  app.put("/api/artists/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, photoUrl, biography } = req.body;
    try {
      const { error } = await supabase
        .from('artists')
        .update({ name, photoUrl, biography })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar artista" });
    }
  });

  app.delete("/api/artists/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await supabase.from('songs').update({ artistId: null }).eq('artistId', id);
      const { error } = await supabase.from('artists').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir artista" });
    }
  });

  // Songbook management routes
  app.get("/api/songbooks", async (req, res) => {
    const cached = getCached('songbooks');
    if (cached) return res.json({ songbooks: cached });
    try {
      const { data: songbooks, error } = await supabase.from('songbooks').select('*');
      if (error) throw error;
      setCache('songbooks', songbooks);
      res.json({ songbooks });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar cancioneiros" });
    }
  });

  app.post("/api/songbooks", isAdmin, async (req, res) => {
    const { name, image, pdfUrl } = req.body;
    try {
      const { data: songbook, error } = await supabase
        .from('songbooks')
        .insert([{ name, image, pdfUrl }])
        .select()
        .single();
      if (error) throw error;
      invalidateCache('songbooks');
      res.json({ songbook });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar cancioneiro" });
    }
  });

  app.patch("/api/songbooks/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, image, pdfUrl } = req.body;
    try {
      const { error } = await supabase
        .from('songbooks')
        .update({ name, image, pdfUrl })
        .eq('id', id);
      if (error) throw error;
      invalidateCache('songbooks');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar cancioneiro" });
    }
  });

  app.delete("/api/songbooks/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await supabase.from('user_favorites').delete().in('songId', (await supabase.from('songs').select('id').eq('songbookId', id)).data?.map(s => s.id) || []);
      await supabase.from('playlist_songs').delete().in('songId', (await supabase.from('songs').select('id').eq('songbookId', id)).data?.map(s => s.id) || []);
      await supabase.from('songs').delete().eq('songbookId', id);
      const { error } = await supabase.from('songbooks').delete().eq('id', id);
      if (error) throw error;
      invalidateCache('songbooks', 'songs');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir cancioneiro" });
    }
  });

  // Song management routes
  app.get("/api/songs", async (req, res) => {
    const token = req.cookies.token;
    let userId: number | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (e) {}
    }

    try {
      // Cache base songs (sem favoritos — favoritos são por usuário)
      let songs = getCached('songs_base');
      if (!songs) {
        const { data, error } = await supabase.from('songs').select('*');
        if (error) throw error;
        songs = data;
        setCache('songs_base', songs);
      }

      let favoriteSongIds: any[] = [];
      if (userId) {
        const { data: favorites } = await supabase.from('user_favorites').select('songId').eq('userId', userId);
        favoriteSongIds = favorites?.map(f => f.songId) || [];
      }

      const mappedSongs = songs.map((song: any) => ({
        ...song,
        isFavorite: favoriteSongIds.includes(song.id),
        videoUrls: song.videoUrls || []
      }));

      res.json({ songs: mappedSongs });
    } catch (error) {
      console.error("Error fetching songs:", error);
      res.status(500).json({ error: "Erro ao buscar músicas" });
    }
  });

  app.post("/api/songs/:id/favorite", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const songId = parseInt(req.params.id, 10);

      const { data: existing, error: checkError } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('userId', userId)
        .eq('songId', songId)
        .single();

      if (existing) {
        await supabase.from('user_favorites').delete().eq('userId', userId).eq('songId', songId);
        res.json({ isFavorite: false });
      } else {
        await supabase.from('user_favorites').insert([{ userId, songId }]);
        res.json({ isFavorite: true });
      }
    } catch (error) {
      console.error('Error in toggleFavorite:', error);
      res.status(500).json({ error: "Erro ao favoritar música" });
    }
  });

  app.post("/api/songs/:id/view", async (req, res) => {
    const { id } = req.params;
    try {
      const { data: song } = await supabase.from('songs').select('view_count').eq('id', id).single();
      const currentCount = song?.view_count || 0;
      await supabase.from('songs').update({ view_count: currentCount + 1 }).eq('id', id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao registrar visualização" });
    }
  });

  app.post("/api/songs", isAdmin, async (req, res) => {
    const { title, category, number, content, content_simplified, content_lyrics, songbookId, artistId, artistIds, isFavorite, imageUrl, videoUrl, videoUrls } = req.body;
    try {
      const { data: song, error } = await supabase
        .from('songs')
        .insert([{ 
          title, 
          category, 
          number, 
          content, 
          content_simplified: content_simplified || null, 
          content_lyrics: content_lyrics || null, 
          songbookId, 
          artistId, 
          artistIds: artistIds || [],
          isFavorite: !!isFavorite, 
          imageUrl: imageUrl || null, 
          videoUrl: videoUrl || null, 
          videoUrls: videoUrls || [] 
        }])
        .select()
        .single();
      
      if (error) throw error;
      invalidateCache('songs_base');
      res.json({ song });
    } catch (error) {
      console.error('Error creating song:', error);
      res.status(500).json({ error: "Erro ao criar música" });
    }
  });

  app.patch("/api/songs/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;

    // Map column names if necessary
    // No mapping needed anymore as we use snake_case for these
    
    try {
      const { error } = await supabase.from('songs').update(updates).eq('id', id);
      if (error) throw error;
      invalidateCache('songs_base');
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({ error: "Erro ao atualizar música" });
    }
  });

  app.delete("/api/songs/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await supabase.from('user_favorites').delete().eq('songId', id);
      await supabase.from('playlist_songs').delete().eq('songId', id);
      const { error } = await supabase.from('songs').delete().eq('id', id);
      if (error) throw error;
      invalidateCache('songs_base');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir música" });
    }
  });

  // Playlist routes
  app.get("/api/playlists", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      
      const { data: playlists, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      res.json({ playlists });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar listas" });
    }
  });

  app.post("/api/playlists", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const { name, description, date } = req.body;
      
      const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data: playlist, error } = await supabase
        .from('playlists')
        .insert([{ name, description, date, userId, shareId }])
        .select()
        .single();
      
      if (error) throw error;
      res.json({ playlist });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar lista" });
    }
  });

  app.post("/api/playlists/create-favorites", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      
      const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data: playlist, error } = await supabase
        .from('playlists')
        .insert([{ name: 'Favoritas', description: 'Minhas músicas favoritas', userId, shareId }])
        .select()
        .single();

      if (error) throw error;

      const { data: favoriteSongs } = await supabase.from('user_favorites').select('songId').eq('userId', userId);
      
      if (favoriteSongs && favoriteSongs.length > 0) {
        const playlistSongs = favoriteSongs.map((fav, index) => ({
          playlistId: playlist.id,
          songId: fav.songId,
          position: index + 1
        }));
        await supabase.from('playlist_songs').insert(playlistSongs);
      }
      
      res.json({ playlist });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar lista de favoritas" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Try both id and shareId
      let query = supabase.from('playlists').select('*');
      if (isNaN(Number(id))) {
        query = query.eq('shareId', id);
      } else {
        query = query.or(`id.eq.${id},shareId.eq.${id}`);
      }
      
      const { data: playlist, error } = await query.single();
      if (error || !playlist) return res.status(404).json({ error: "Lista não encontrada" });
      
      const { data: playlistSongs, error: songsError } = await supabase
        .from('playlist_songs')
        .select('songs(*), position')
        .eq('playlistId', playlist.id)
        .order('position', { ascending: true });
      
      if (songsError) throw songsError;
      
      const songs = playlistSongs.map((ps: any) => ({
        ...ps.songs,
        position: ps.position
      }));
      
      res.json({ playlist, songs });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar lista" });
    }
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const { id } = req.params;
      
      const { data: playlist } = await supabase.from('playlists').select('userId').eq('id', id).single();
      if (!playlist || playlist.userId !== userId) return res.status(403).json({ error: "Acesso negado" });
      
      await supabase.from('playlist_songs').delete().eq('playlistId', id);
      await supabase.from('playlists').delete().eq('id', id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir lista" });
    }
  });

  app.post("/api/playlists/:id/songs", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const { id } = req.params;
      const { songId } = req.body;
      
      const { data: playlist } = await supabase.from('playlists').select('userId').eq('id', id).single();
      if (!playlist || playlist.userId !== userId) return res.status(403).json({ error: "Acesso negado" });
      
      const { data: maxPosData } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlistId', id)
        .order('position', { ascending: false })
        .limit(1);
        
      const position = (maxPosData?.[0]?.position || 0) + 1;
      
      const { error } = await supabase.from('playlist_songs').insert([{ playlistId: id, songId, position }]);
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "Música já está na lista" });
        throw error;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao adicionar música à lista" });
    }
  });

  app.delete("/api/playlists/:id/songs/:songId", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const { id, songId } = req.params;
      
      const { data: playlist } = await supabase.from('playlists').select('userId').eq('id', id).single();
      if (!playlist || playlist.userId !== userId) return res.status(403).json({ error: "Acesso negado" });
      
      await supabase.from('playlist_songs').delete().eq('playlistId', id).eq('songId', songId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover música da lista" });
    }
  });

  app.put("/api/playlists/:id/songs/reorder", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const { id } = req.params;
      const { songIds } = req.body; 
      
      const { data: playlist } = await supabase.from('playlists').select('userId').eq('id', id).single();
      if (!playlist || playlist.userId !== userId) return res.status(403).json({ error: "Acesso negado" });
      
      // Update positions
      for (let i = 0; i < songIds.length; i++) {
        await supabase
          .from('playlist_songs')
          .update({ position: i + 1 })
          .eq('playlistId', id)
          .eq('songId', songIds[i]);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao reordenar músicas" });
    }
  });

  app.patch("/api/users/:id/role", isAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: "Papel inválido" });
    }

    try {
      const { data: user, error: getError } = await supabase.from('users').select('username').eq('id', id).single();
      if (getError || !user) return res.status(404).json({ error: "Usuário não encontrado" });

      console.log(`[ADMIN ACTION] User ${req.user.username} is toggling role of user ${user.username} (id ${id}) to ${role}`);
      
      const { error } = await supabase.from('users').update({ role }).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error("Error toggling user role:", error);
      res.status(500).json({ error: "Erro ao atualizar papel" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req: any, res: any) => {
    const { id } = req.params;
    const adminId = req.user.id;

    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: "Você não pode excluir sua própria conta." });
    }

    try {
      const { data: user, error: getError } = await supabase.from('users').select('username, role').eq('id', id).single();
      if (getError || !user) return res.status(404).json({ error: "Usuário não encontrado" });

      console.log(`[ADMIN ACTION] User ${req.user.username} is deleting account of user ${user.username} (id ${id})`);

      // Clean up related data
      await supabase.from('user_favorites').delete().eq('userId', id);
      const { data: playlists } = await supabase.from('playlists').select('id').eq('userId', id);
      if (playlists && playlists.length > 0) {
        const playlistIds = playlists.map((p: any) => p.id);
        await supabase.from('playlist_songs').delete().in('playlistId', playlistIds);
        await supabase.from('playlists').delete().eq('userId', id);
      }

      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  });

  app.patch("/api/auth/profile", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { name, username, email, password, city, age, photoUrl } = req.body;

      const updates: any = { name, username, email, city, age, photoUrl };

      if (password) {
        updates.password = bcrypt.hashSync(password, 10);
      }

      const { error } = await supabase.from('users').update(updates).eq('id', decoded.id);
      if (error) throw error;

      // Generate new token with updated info
      const userPayload = { id: decoded.id, username, email, name, role: decoded.role, city, age, photoUrl };
      const newToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", newToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ user: userPayload });
    } catch (error: any) {
      if (error.code === "23505") {
        if (error.message.includes("email")) {
          return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        return res.status(400).json({ error: "Nome de usuário já cadastrado" });
      }
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // App Settings routes
  app.get("/api/backup", isAdmin, async (req, res) => {
    try {
      const { data: artists } = await supabase.from('artists').select('*');
      const { data: songbooks } = await supabase.from('songbooks').select('*');
      const { data: songs } = await supabase.from('songs').select('*');
      const { data: academy } = await supabase.from('academy').select('*');
      res.json({ artists, songbooks, songs, academy });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });

  app.post("/api/restore", isAdmin, async (req: any, res: any) => {
    const { artists, songbooks, songs, academy } = req.body;
    
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "O arquivo de backup está vazio ou em formato inválido." });
    }

    try {
      // Clear existing data (in order to avoid foreign key violations)
      await supabase.from('playlist_songs').delete().neq('playlistId', 0);
      await supabase.from('user_favorites').delete().neq('userId', 0);
      await supabase.from('songs').delete().neq('id', 0);
      await supabase.from('songbooks').delete().neq('id', 0);
      await supabase.from('artists').delete().neq('id', 0);
      await supabase.from('academy').delete().neq('id', 0);

      if (artists) await supabase.from('artists').insert(artists);
      if (songbooks) await supabase.from('songbooks').insert(songbooks);
      if (songs) {
        const mappedSongs = songs.map((s: any) => ({
          ...s,
          videoUrls: s.videoUrls ? (typeof s.videoUrls === 'string' ? JSON.parse(s.videoUrls) : s.videoUrls) : []
        }));
        await supabase.from('songs').insert(mappedSongs);
      }
      if (academy) await supabase.from('academy').insert(academy);

      res.json({ success: true });
    } catch (error: any) {
      console.error("RESTORE error:", error);
      res.status(500).json({ error: "Erro interno ao restaurar backup", details: error.message });
    }
  });

  app.get("/api/settings/loading-image", async (req, res) => {
    try {
      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'loading_image').single();
      res.json({ url: setting?.value || "https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar imagem de carregamento" });
    }
  });

  app.post("/api/settings/loading-image", isAdmin, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });

    try {
      await supabase.from('app_settings').upsert({ key: 'loading_image', value: url });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar imagem de carregamento" });
    }
  });

  app.get("/api/settings/app-icon", async (req, res) => {
    try {
      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'app_icon').single();
      res.json({ url: setting?.value || "https://i0.wp.com/schoenstatt.org.br/wp-content/uploads/2017/10/Mater-Admirabilis.jpg?fit=400%2C400&ssl=1" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar ícone do app" });
    }
  });

  app.post("/api/settings/app-icon", isAdmin, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL é obrigatória" });

    try {
      await supabase.from('app_settings').upsert({ key: 'app_icon', value: url });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar ícone do app" });
    }
  });

  // Academy routes
  app.get("/api/academy", async (req, res) => {
    try {
      const { data: items, error } = await supabase.from('academy').select('*').order('createdAt', { ascending: false });
      if (error) throw error;
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar itens do Academy" });
    }
  });

  app.post("/api/academy", isAdmin, async (req, res) => {
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { data: item, error } = await supabase
        .from('academy')
        .insert([{ title, description, videoUrl, content, type }])
        .select()
        .single();
      if (error) throw error;
      res.json({ item });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar item no Academy" });
    }
  });

  app.patch("/api/academy/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { error } = await supabase
        .from('academy')
        .update({ title, description, videoUrl, content, type })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar item no Academy" });
    }
  });

  app.delete("/api/academy/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from('academy').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir item no Academy" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: process.cwd(),
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.use("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
