#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { slugify, difficultyBand, STATUS_LABELS, escHtml } = require('../utils.js');

// Create sheets directory
const sheetsDir = path.join(__dirname, '../sheets');
if (!fs.existsSync(sheetsDir)) {
  fs.mkdirSync(sheetsDir, { recursive: true });
}

// Load template
const templatePath = path.join(__dirname, '../templates/song-page.html');
const template = fs.readFileSync(templatePath, 'utf8');

function metaRow(label, value) {
  return `<div class="meta-row"><span class="meta-label">${label}</span><span class="meta-value">${value}</span></div>`;
}

// Generate labeled metadata rows HTML
function generateMetadataRows(props) {
  const rows = [];

  if (props.artist) rows.push(metaRow('Artist', escHtml(props.artist)));

  if (props.chords) {
    const pills = props.chords.split(',')
      .map(c => c.trim()).filter(Boolean)
      .map(c => `<span class="chord-pill">${escHtml(c)}</span>`)
      .join('');
    rows.push(metaRow('Chords', `<span class="chord-pills">${pills}</span>`));
  }

  const band = difficultyBand(props.difficulty);
  if (band) rows.push(metaRow('Difficulty',
    `<span class="chip chip-diff-${band}">${escHtml(props.difficulty)}</span>`));

  if (props.year) rows.push(metaRow('Year', escHtml(props.year)));

  if (props.language) rows.push(metaRow('Language', escHtml(props.language)));

  if (props.status) rows.push(metaRow('Status',
    `<span class="chip chip-status-${escHtml(props.status)}">${escHtml(STATUS_LABELS[props.status] || props.status)}</span>`));

  return rows.length ? `<div class="song-meta">${rows.join('')}</div>` : '';
}

// Render template with variables
function renderTemplate(templateStr, vars) {
  let result = templateStr;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
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

    // Prepare template variables
    const encodedId = encodeURIComponent(song.id);
    const pdfUrl = `https://storage.googleapis.com/songbook-generator-cache-europe-west1/song-sheets/${encodedId}.pdf`;
    const title = `${props.song} – ${props.artist}`;
    const description = `Ukulele chord sheet for "${props.song}" by ${props.artist}. Free chord sheet from Ukulele Tuesday.`;

    const searchQuery = encodeURIComponent(`${props.song} ${props.artist}`);
    const spotifyUrl = `https://open.spotify.com/search/${searchQuery}`;
    const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

    const templateVars = {
      TITLE: escHtml(title),
      SONG: escHtml(props.song),
      DESCRIPTION: escHtml(description),
      PDF_URL: pdfUrl,
      SPOTIFY_URL: spotifyUrl,
      YOUTUBE_URL: youtubeUrl,
      SLUG: slug,
      METADATA_ROWS: generateMetadataRows(props),
    };

    // Render and write
    const html = renderTemplate(template, templateVars);
    const indexPath = path.join(songDir, 'index.html');
    fs.writeFileSync(indexPath, html);

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
