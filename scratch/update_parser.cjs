const fs = require('fs');

let content = fs.readFileSync('src/utils/chordParser.tsx', 'utf8');

const boldHelper = `
const renderTextWithBold = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\\*\\*.*?\\*\\*|\\*.*?\\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <strong key={i} className="font-bold">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};
`;

if (!content.includes('renderTextWithBold')) {
  // Insert helper after imports
  content = content.replace("import React from 'react';\n", "import React from 'react';\n" + boldHelper);
  
  // Replace <span key={index}>{cleanLine}{newline}</span>
  // Note: we need to be careful not to break anything.
  // We can just replace `{cleanLine}` with `{renderTextWithBold(cleanLine)}`
  content = content.replace(/>\{cleanLine\}\{newline\}<\/span>/g, '>{renderTextWithBold(cleanLine)}{newline}</span>');
  
  // Also inside `return <span key={wIndex}>{word}</span>;` for non-chord words inside chord lines?
  // User wants "letras em negrito na música" (bold lyrics in the song).
  // Yes, replacing {cleanLine} is enough for non-chord lines.
  // Wait, if a line has chords, the lyrics are usually on the NEXT line. So replacing {cleanLine} is perfect.

  fs.writeFileSync('src/utils/chordParser.tsx', content, 'utf8');
  console.log("Updated chordParser.tsx!");
} else {
  console.log("Already updated.");
}
