#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create sheets directory
const sheetsDir = path.join(__dirname, '../sheets');
if (!fs.existsSync(sheetsDir)) {
  fs.mkdirSync(sheetsDir, { recursive: true });
}

// Load template
const templatePath = path.join(__dirname, '../templates/song-page.html');
const template = fs.readFileSync(templatePath, 'utf8');

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

// Determine difficulty band
function difficultyBand(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (n <= 2.0) return "easy";
  if (n <= 3.5) return "medium";
  return "hard";
}

// Status labels mapping
const STATUS_LABELS = {
  APPROVED: "Approved",
  READY_TO_PLAY: "Ready to play",
  DRAFT: "Draft",
  REJECTED: "Rejected",
};

// Generate metadata chips HTML
function generateMetadataChips(props) {
  const chips = [];

  if (props.status) {
    const label = STATUS_LABELS[props.status] || props.status;
    chips.push(`<span class="chip chip-status-${escapeHtml(props.status)}" style="background-color: rgba(255, 255, 255, 0.25); color: #fff; display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 12px;">${escapeHtml(label)}</span>`);
  }

  const band = difficultyBand(props.difficulty);
  if (band) {
    chips.push(`<span class="chip chip-diff-${band}" style="background-color: rgba(255, 255, 255, 0.25); color: #fff; display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 12px;">${escapeHtml(props.difficulty)}</span>`);
  }

  if (props.year) {
    chips.push(`<span class="chip chip-neutral" style="background-color: rgba(255, 255, 255, 0.25); color: #fff; display: inline-block; font-size: 0.75rem; font-weight: 500; padding: 2px 8px; border-radius: 12px;">${escapeHtml(props.year)}</span>`);
  }

  return chips.join('');
}

// Generate chords HTML
function generateChordsHtml(chords) {
  if (!chords) return '';
  return `<div class="song-chords">${escapeHtml(chords)}</div>`;
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

    const templateVars = {
      TITLE: escapeHtml(title),
      DESCRIPTION: escapeHtml(description),
      PDF_URL: pdfUrl,
      SLUG: slug,
      METADATA_CHIPS: generateMetadataChips(props),
      CHORDS_HTML: generateChordsHtml(props.chords),
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
