import lunr from 'lunr';
import {
  slugify,
  difficultyBand,
  difficultyLabel,
  escHtml,
  buildBadges,
  renderBadge,
} from '../utils/utils.js';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchSongs() {
  const url = './data.jsonl';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – could not fetch dataset`);
  const text = await res.text();
  return text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function buildIndex(songs) {
  return lunr(function () {
    this.ref('id');
    this.field('song',         { boost: 10 });
    this.field('artist',       { boost: 8  });
    this.field('chords',       { boost: 3  });
    this.field('tabber',       { boost: 2  });
    this.field('specialbooks', { boost: 2  });
    this.field('language');
    this.field('features');

    songs.forEach(s => {
      const p = s.properties || {};
      this.add({
        id:           s.id,
        song:         p.song         || '',
        artist:       p.artist       || '',
        chords:       (p.chords || '').replace(/,/g, ' '),
        tabber:       p.tabber       || '',
        specialbooks: (p.specialbooks || '').replace(/,/g, ' '),
        language:     p.language     || '',
        features:     p.features     || '',
      });
    });
  });
}

function lunrSearch(lunrIndex, allSongs, query) {
  try {
    const hits = lunrIndex.search(query);
    if (hits.length > 0) return new Set(hits.map(h => h.ref));
  } catch (_) { /* fall through */ }

  try {
    const wildcardQuery = query.trim().split(/\s+/).map(t => `${t}*`).join(' ');
    const hits = lunrIndex.search(wildcardQuery);
    return new Set(hits.map(h => h.ref));
  } catch (_) { /* fall through */ }

  const q = query.toLowerCase();
  return new Set(
    allSongs
      .filter(s => {
        const p = s.properties || {};
        return (
          (p.song   || '').toLowerCase().includes(q) ||
          (p.artist || '').toLowerCase().includes(q) ||
          (p.chords || '').toLowerCase().includes(q)
        );
      })
      .map(s => s.id)
  );
}

function applyFilters(songs, lunrIndex, allSongs, filters) {
  let result = songs;

  if (filters.query && lunrIndex) {
    const hitIds = lunrSearch(lunrIndex, allSongs, filters.query);
    result = result.filter(s => hitIds.has(s.id));
  }

  if (filters.difficulty) {
    result = result.filter(s => {
      const band = difficultyBand((s.properties || {}).difficulty);
      return band === filters.difficulty;
    });
  }

  if (filters.book) {
    result = result.filter(s => {
      const books = ((s.properties || {}).specialbooks || '')
        .split(',').map(b => b.trim());
      return books.includes(filters.book);
    });
  }

  return result;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function songUrl(song) {
  const props = song.properties || {};
  if (!props.song || !props.artist) return '#';
  const slug = `${slugify(props.song)}-${slugify(props.artist)}`;
  return `./sheets/${slug}/`;
}

function pdfUrl(song) {
  const songId = song.id || '';
  return `https://storage.googleapis.com/songbook-generator-cache-europe-west1/song-sheets/${encodeURIComponent(songId)}.pdf`;
}

function getFilters() {
  return {
    query:      document.getElementById('search').value.trim(),
    difficulty: document.getElementById('filter-difficulty').value,
    book:       document.getElementById('filter-book').value,
  };
}

function renderCard(song) {
  const p      = song.properties || {};
  const band   = difficultyBand(p.difficulty);
  const url    = songUrl(song);
  const pdf    = pdfUrl(song);
  const title  = escHtml(p.song   || song.name || 'Unknown title');
  const artist = escHtml(p.artist || 'Unknown artist');

  const diffChip = band
    ? `<span class="chip chip-diff-${band}">${escHtml(difficultyLabel(band))}</span>`
    : '';

  const yearChip = p.year
    ? `<span class="chip chip-neutral">${escHtml(p.year)}</span>`
    : '';

  const chips = buildBadges(p).map(b => renderBadge(b, { iconOnly: true })).join('') + diffChip + yearChip;

  const chordsHtml = p.chords
    ? `<div class="card-chords" title="${escHtml(p.chords)}">${escHtml(p.chords)}</div>`
    : '';

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}/sheets/${slugify(p.song)}-${slugify(p.artist)}/`;

  return `
    <div class="card" role="listitem" style="position: relative;">
      <a href="${url}" target="_blank" rel="noopener noreferrer"
         aria-label="Open song sheet: ${title} by ${artist}" style="text-decoration: none; color: inherit;">
        <div class="card-accent accent-${band || 'default'}"></div>
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="card-artist">${artist}</div>
          ${chordsHtml}
          <div class="card-chips">${chips}</div>
        </div>
      </a>
      <div class="card-share card-icons">
        <a href="${pdf}" target="_blank" rel="noopener noreferrer" class="icon-btn" title="Download PDF">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
        <button class="icon-btn" data-share-url="${shareUrl}" title="Copy share link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>
    </div>`;
}

let allSongs  = [];
let lunrIndex = null;

function render() {
  const filters  = getFilters();
  const filtered = applyFilters(allSongs, lunrIndex, allSongs, filters);

  document.getElementById('result-count').innerHTML =
    `Showing <strong>${filtered.length.toLocaleString()}</strong> of
     <strong>${allSongs.length.toLocaleString()}</strong> songs`;

  const container = document.getElementById('results');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">No songs match your search. Try different terms or clear the filters.</div>';
  } else {
    container.innerHTML = filtered.map(s => renderCard(s)).join('');
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    allSongs = await fetchSongs();

    allSongs.sort((a, b) => {
      const sa = ((a.properties || {}).song || a.name || '').toLowerCase();
      const sb = ((b.properties || {}).song || b.name || '').toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });

    lunrIndex = buildIndex(allSongs);

    document.getElementById('loading').hidden = true;
    document.getElementById('header-count-inline').textContent =
      allSongs.length.toLocaleString();

    render();

  } catch (err) {
    document.getElementById('loading').hidden = true;
    const errEl = document.getElementById('error');
    errEl.hidden = false;
    errEl.innerHTML =
      `<p>⚠️ Failed to load song sheets.</p>` +
      `<p style="font-size:0.85rem;margin-top:8px;">${escHtml(String(err))}</p>`;
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('search').addEventListener('input', render);
document.getElementById('filter-difficulty').addEventListener('change', render);
document.getElementById('filter-book').addEventListener('change', render);

document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('search').value           = '';
  document.getElementById('filter-difficulty').value = '';
  document.getElementById('filter-book').value      = '';
  render();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.icon-btn');
  if (!btn) return;

  const url = btn.dataset.shareUrl;
  if (url) {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      navigator.share({ title: document.title, url })
        .catch(err => { if (err.name !== 'AbortError') console.error('Share failed:', err); });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      });
    }
  }
});

init();
