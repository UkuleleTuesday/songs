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

// HTML escape for safe embedding in attributes
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inline PDF display template with social sharing
function songPageTemplate(songId, props) {
  const encodedId = encodeURIComponent(songId);
  const pdfUrl = `https://storage.googleapis.com/songbook-generator-cache-europe-west1/song-sheets/${encodedId}.pdf`;

  const song = props.song || 'Unknown Song';
  const artist = props.artist || 'Unknown Artist';
  const title = `${song} – ${artist}`;
  const description = `Ukulele chord sheet for "${song}" by ${artist}. Free chord sheet from Ukulele Tuesday.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Social Media Meta Tags -->
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="https://songbooks.ukuleletuesday.ie/assets/uke-closeup.jpeg">
  <meta property="og:url" content="https://ukuleletuesday.github.io/songs/sheets/${slugify(song)}-${slugify(artist)}/">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="https://songbooks.ukuleletuesday.ie/assets/uke-closeup.jpeg">

  <link rel="icon" href="https://songbooks.ukuleletuesday.ie/assets/favicon.png" type="image/png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
    }

    .header {
      background: white;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header h1 {
      font-size: 1.25rem;
      color: #333;
      flex: 1;
      min-width: 200px;
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1rem;
      border: none;
      border-radius: 4px;
      font-size: 0.95rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #ff6b6b;
      color: white;
    }

    .btn-primary:hover {
      background: #ee5a5a;
    }

    .btn-secondary {
      background: white;
      color: #333;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background: #f9f9f9;
    }

    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .pdf-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-height: 600px;
      display: flex;
      flex-direction: column;
    }

    embed {
      flex: 1;
      width: 100%;
      height: 600px;
      min-height: 600px;
    }

    .pdf-fallback {
      padding: 2rem;
      text-align: center;
      color: #666;
    }

    .pdf-fallback p {
      margin: 1rem 0;
      font-size: 0.95rem;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 1rem;
      color: #ff6b6b;
      text-decoration: none;
      font-size: 0.9rem;
    }

    .back-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      embed {
        height: 400px;
        min-height: 400px;
      }

      .header h1 {
        font-size: 1.1rem;
      }

      .btn {
        font-size: 0.9rem;
        padding: 0.6rem 0.8rem;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="header-buttons">
        <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" title="Open PDF">
          📥 Download PDF
        </a>
        <a href="../" class="btn btn-secondary" title="Back to songs">
          ← Back to Songs
        </a>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="pdf-container">
      <embed src="${pdfUrl}" type="application/pdf" title="${escapeHtml(title)}">
      <div class="pdf-fallback">
        <p>📄 PDF couldn't be displayed inline.</p>
        <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          📥 Download PDF
        </a>
      </div>
    </div>
  </div>
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

    // Write song page HTML with inline PDF display
    const indexPath = path.join(songDir, 'index.html');
    fs.writeFileSync(indexPath, songPageTemplate(song.id, props));

    count++;
  } catch (err) {
    console.error('Error processing line:', err.message);
  }
});

rl.on('close', () => {
  console.log(`✓ Generated ${count} song pages in /sheets`);
});

rl.on('error', (err) => {
  console.error('Error reading data.jsonl:', err);
  process.exit(1);
});
