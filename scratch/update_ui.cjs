const fs = require('fs');

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Add artistIds to the fetch maps in Songbook.tsx
  content = content.replace(
    /artistId: s\.artistId \? s\.artistId\.toString\(\) : null,/g,
    'artistId: s.artistId ? s.artistId.toString() : null,\n            artistIds: s.artistIds || [],'
  );
  content = content.replace(
    /artistId: s\.artistId\?\.toString\(\),/g,
    'artistId: s.artistId?.toString(),\n                artistIds: s.artistIds || [],'
  );
  content = content.replace(
    /artistId: data\.song\.artistId \? data\.song\.artistId\.toString\(\) : null,/g,
    'artistId: data.song.artistId ? data.song.artistId.toString() : null,\n            artistIds: data.song.artistIds || [],'
  );

  // Replace rendering strings
  // pattern: {artists.find(a => a.id === song.artistId)?.name || t('songbook.unknownArtist')}
  content = content.replace(
    /\{artists\.find\(a => a\.id === (song|s|selectedSong)\.artistId\)\?\.name \|\| t\('songbook\.unknownArtist'\)\}/g,
    '{($1.artistIds && $1.artistIds.length > 0) ? $1.artistIds.map(id => artists.find(a => a.id === id)?.name).filter(Boolean).join(\', \') : (artists.find(a => a.id === $1.artistId)?.name || t(\'songbook.unknownArtist\'))}'
  );

  // Search filter
  // artist && artist.name.toLowerCase().includes(query)
  // We need to also search through artistIds
  content = content.replace(
    /\(artist && artist\.name\.toLowerCase\(\)\.includes\(query\)\)/g,
    '((artist && artist.name.toLowerCase().includes(query)) || (s.artistIds && s.artistIds.some(id => artists.find(a => a.id === id)?.name.toLowerCase().includes(query))))'
  );

  content = content.replace(
    /artists\.find\(a => a\.id === s\.artistId\)\?\.name\.toLowerCase\(\)\.includes\(songSearchQuery\.toLowerCase\(\)\)/g,
    '(artists.find(a => a.id === s.artistId)?.name.toLowerCase().includes(songSearchQuery.toLowerCase()) || (s.artistIds && s.artistIds.some(id => artists.find(a => a.id === id)?.name.toLowerCase().includes(songSearchQuery.toLowerCase()))))'
  );

  fs.writeFileSync(path, content, 'utf8');
}

updateFile('src/components/Songbook.tsx');
updateFile('src/components/PlaylistsView.tsx');

console.log("Updated files!");
