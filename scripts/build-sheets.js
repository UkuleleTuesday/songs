#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create sheets directory
const sheetsDir = path.join(__dirname, '../sheets');
if (!fs.existsSync(sheetsDir)) {
  fs.mkdirSync(sheetsDir, { recursive: true });
}

// Slug generator - matches client-side version
function slugify(text) {
  if (!text) return 'unknown';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Redirect template
function redirectTemplate(songId) {
  const encodedId = encodeURIComponent(songId);
  const pdfUrl = `https://storage.googleapis.com/songbook-generator-cache-europe-west1/song-sheets/${encodedId}.pdf`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting...</title>
  <script>
    // Redirect to PDF while keeping friendly URL in browser
    window.history.replaceState(null, '', window.location.href);
    window.location.href = '${pdfUrl}';
  </script>
</head>
<body>
  <p>Redirecting to song sheet...</p>
</body>
</html>`;
}

// Process data.jsonl
const dataPath = path.join(__dirname, '../data.jsonl');
const rl = readline.createInterface({
  input: fs.createReadStream(dataPath),
  crlfDelay: Infinity,
});

let count = 0;

rl.on('line', (line) => {
  try {
    const song = JSON.parse(line);
    const props = song.properties || {};

    if (!props.song || !props.artist) return;

    const slug = `${slugify(props.song)}-${slugify(props.artist)}`;
    const songDir = path.join(sheetsDir, slug);

    // Create directory
    if (!fs.existsSync(songDir)) {
      fs.mkdirSync(songDir, { recursive: true });
    }

    // Write redirect HTML
    const indexPath = path.join(songDir, 'index.html');
    fs.writeFileSync(indexPath, redirectTemplate(song.id));

    count++;
  } catch (err) {
    console.error('Error processing line:', err.message);
  }
});

rl.on('close', () => {
  console.log(`✓ Generated ${count} song sheet redirects in /sheets`);
});

rl.on('error', (err) => {
  console.error('Error reading data.jsonl:', err);
  process.exit(1);
});
