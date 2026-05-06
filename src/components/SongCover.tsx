import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface SongCoverProps {
  song: any;
  artist?: any;
  className?: string;
  iconSize?: number;
}

export function SongCover({ song, className = "w-12 h-12 rounded-xl", iconSize = 20 }: SongCoverProps) {
  const [spotifyThumb, setSpotifyThumb] = useState<string | null>(null);

  useEffect(() => {
    const url = song?.videoUrl || (song?.videoUrls && song.videoUrls.length > 0 ? song.videoUrls[0] : null);
    if (url && url.includes('spotify.com')) {
      fetch(`https://open.spotify.com/oembed?url=${url}`)
        .then(res => res.json())
        .then(data => setSpotifyThumb(data.thumbnail_url))
        .catch(() => setSpotifyThumb(null));
    } else {
      setSpotifyThumb(null);
    }
  }, [song?.videoUrl, song?.videoUrls]);

  const getYoutubeThumbnail = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/ ;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
      ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
      : null;
  };

  const urlForThumb = song?.videoUrl || (song?.videoUrls && song.videoUrls.length > 0 ? song.videoUrls[0] : null);
  const videoThumbnail = urlForThumb
    ? (urlForThumb.includes('youtube.com') || urlForThumb.includes('youtu.be')
        ? getYoutubeThumbnail(urlForThumb)
        : spotifyThumb)
    : null;

  // Prioridade: capa cadastrada > thumbnail YouTube/Spotify — sem foto do artista
  const finalImageUrl = song?.imageUrl || videoThumbnail;

  return (
    <div className={`${className} bg-bg-secondary overflow-hidden flex-shrink-0 border border-border-color shadow-sm relative`}>
      {finalImageUrl ? (
        <img src={finalImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30">
          <Music size={iconSize} />
        </div>
      )}
    </div>
  );
}
