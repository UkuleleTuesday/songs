import lunr from 'lunr';
import {
  slugify,
  difficultyBand,
  difficultyLabel,
  DIFFICULTY_BANDS,
  decadeBand,
  decadeFloor,
  decadeFilterBand,
  decadeFilterLabel,
  PRE_DECADE_PREFIX,
  escHtml,
  buildBadges,
  renderBadge,
  COUNTRY_DEFS,
  getCountry,
  parseCountry,
  renderCountry,
  THEME_DEFS,
  getTheme,
  parseTheme,
  renderTheme,
  parseGenres,
  renderGenre,
  splitTagsByThreshold,
  filtersToSearchParams,
  parseFiltersFromSearch,
} from '../utils/utils.js';
import { toggleFilterPill } from './filter-pills.js';

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
    this.field('country',  { boost: 2  });
    this.field('theme',    { boost: 2  });
    this.field('language');
    this.field('features');
    this.field('genre',    { boost: 2  });

    songs.forEach(s => {
      const p = s.properties || {};
      this.add({
        id:       s.id,
        song:     p.song     || '',
        artist:   p.artist   || '',
        chords:   (p.chords || '').replace(/,/g, ' '),
        tabber:   p.tabber   || '',
        country:  (p.country || '').replace(/,/g, ' '),
        theme:    (p.theme   || '').replace(/,/g, ' '),
        language: p.language || '',
        features: p.features || '',
        genre:    (p.genre   || '').replace(/,/g, ' '),
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

  if (filters.difficulties.length) {
    result = result.filter(s => {
      const band = difficultyBand((s.properties || {}).difficulty);
      return filters.difficulties.includes(band);
    });
  }

  if (filters.decades.length) {
    result = result.filter(s => {
      const band = decadeFilterBand((s.properties || {}).year, decadeFloorYear);
      return band != null && filters.decades.includes(band);
    });
  }

  if (filters.countries.length) {
    result = result.filter(s => {
      const countries = parseCountry(s.properties || {});
      return filters.countries.some(c => countries.includes(c));
    });
  }

  if (filters.themes.length) {
    result = result.filter(s => {
      const themes = parseTheme(s.properties || {});
      return filters.themes.some(t => themes.includes(t));
    });
  }

  if (filters.genres.length) {
    result = result.filter(s => {
      const genres = parseGenres(s.properties || {});
      return filters.genres.some(g => genres.includes(g));
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
    query:        document.getElementById('search').value.trim(),
    difficulties: [...activeDifficulties],
    decades:      [...activeDecades],
    countries:    [...activeCountries],
    themes:       [...activeThemes],
    genres:       [...activeGenres],
    sort:         document.getElementById('sort-by').value,
  };
}

function getEffectiveDate(song) {
  const p = song.properties || {};
  const raw = p.ready_to_play_date || p.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function sortSongs(songs, sortBy) {
  if (sortBy === 'last-added') {
    return [...songs].sort((a, b) => {
      const da = getEffectiveDate(a);
      const db = getEffectiveDate(b);
      if (da && db) return db - da;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });
  }
  // default: title A–Z
  return [...songs].sort((a, b) => {
    const sa = ((a.properties || {}).song || a.name || '').toLowerCase();
    const sb = ((b.properties || {}).song || b.name || '').toLowerCase();
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
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

  const decade = decadeFilterBand(p.year, decadeFloorYear);
  const yearChip = p.year
    ? (decade != null
        ? `<span class="chip chip-neutral chip-clickable" data-filter-type="decade" data-filter-value="${escHtml(decade)}" role="button" tabindex="0" title="Filter by ${escHtml(decadeFilterLabel(decade))}">${escHtml(p.year)}</span>`
        : `<span class="chip chip-neutral">${escHtml(p.year)}</span>`)
    : '';

  const countryChips = parseCountry(p).map(c => renderCountry(c, { clickable: true })).join('');
  const themeChips   = parseTheme(p).map(t => renderTheme(t,   { clickable: true })).join('');
  const genreChips   = parseGenres(p).map(g => renderGenre(g,  { clickable: true })).join('');

  const chips = buildBadges(p).map(b => renderBadge(b, { iconOnly: true })).join('')
    + diffChip + yearChip + themeChips + countryChips + genreChips;

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
// The floor decade for bucketing sparse early decades into a single "Pre-<floor>s"
// pill. Computed once from the dataset in renderDecadePills; null = no bucketing.
let decadeFloorYear = null;
const activeDifficulties = new Set();
const activeDecades      = new Set();
const activeCountries    = new Set();
const activeThemes       = new Set();
const activeGenres       = new Set();

// Maps each multi-select filter type to its backing Set, the container holding
// its pills, and the data-attribute the pills carry. Shared by the pill click
// handlers, the clickable card chips, and URL state restore so all three toggle
// filters through one code path.
const FILTER_GROUPS = {
  difficulty: { set: activeDifficulties, container: 'difficulty-filter', attr: 'difficulty' },
  decade:     { set: activeDecades,      container: 'decade-filter',     attr: 'decade'     },
  country:    { set: activeCountries,    container: 'country-filter',    attr: 'country'    },
  theme:      { set: activeThemes,       container: 'theme-filter',      attr: 'theme'      },
  genre:      { set: activeGenres,       container: 'genre-filter',      attr: 'genre'      },
};

// Toggle a filter value by type, dispatching to the shared pill helper. Keeps
// the type-based call sites (handlers, chips, URL restore) ergonomic while the
// DOM logic lives in the testable filter-pills module. Does not render.
function setFilterActive(type, value, active) {
  toggleFilterPill(FILTER_GROUPS[type], value, active);
}

// Push the current filter state into the URL's query string (without adding a
// history entry) so the view is shareable and survives a reload.
function syncUrl(filters) {
  const qs  = filtersToSearchParams(filters).toString();
  const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  history.replaceState(null, '', url);
}

// Seed the UI from query-string params on first load.
function applyInitialFilters() {
  const f = parseFiltersFromSearch(window.location.search);
  if (f.query) document.getElementById('search').value = f.query;
  if (f.sort)  document.getElementById('sort-by').value = f.sort;
  f.difficulties.forEach(v => setFilterActive('difficulty', v, true));
  f.decades.forEach(v      => setFilterActive('decade',     v, true));
  f.countries.forEach(v    => setFilterActive('country',    v, true));
  f.themes.forEach(v       => setFilterActive('theme',      v, true));
  f.genres.forEach(v       => setFilterActive('genre',      v, true));
}

// Country pills: COUNTRY_DEFS order for known entries, then unknowns by frequency.
// Popular ones show by default; long tail collapses behind "More".
function renderCountryPills(songs) {
  const counts = new Map();
  songs.forEach(s => parseCountry(s.properties || {}).forEach(c => {
    counts.set(c, (counts.get(c) || 0) + 1);
  }));

  const known   = Object.keys(COUNTRY_DEFS).filter(id => counts.has(id));
  const unknown = [...counts.keys()].filter(id => !(id in COUNTRY_DEFS)).sort();
  const ordered = [...known, ...unknown];

  const container = document.getElementById('country-filter');
  if (!container) return;

  const [shown, hidden] = splitTagsByThreshold(ordered, counts);

  const pill = (id, extra = '') => {
    const c = getCountry(id);
    return `<button type="button" class="tag-pill country-pill${extra}" data-country="${escHtml(id)}" aria-pressed="false">`
      + `${escHtml(c.emoji)} ${escHtml(c.label)}</button>`;
  };

  let html = shown.map(id => pill(id)).join('');
  if (hidden.length) {
    html += `<button type="button" id="country-more" class="tag-more" aria-expanded="false">`
      + `+${hidden.length} more</button>`;
    html += hidden.map(id => pill(id, ' tag-overflow-item')).join('');
    container.classList.add('overflow-collapsed');
  } else {
    container.classList.remove('overflow-collapsed');
  }
  container.innerHTML = html;
}

// Theme pills: THEME_DEFS order, all shown (only ~6 values so no collapse needed).
function renderThemePills(songs) {
  const counts = new Map();
  songs.forEach(s => parseTheme(s.properties || {}).forEach(t => {
    counts.set(t, (counts.get(t) || 0) + 1);
  }));

  const known   = Object.keys(THEME_DEFS).filter(id => counts.has(id));
  const unknown = [...counts.keys()].filter(id => !(id in THEME_DEFS)).sort();
  const ordered = [...known, ...unknown];

  const container = document.getElementById('theme-filter');
  if (!container) return;

  const pill = (id) => {
    const t = getTheme(id);
    return `<button type="button" class="tag-pill theme-pill" data-theme="${escHtml(id)}" aria-pressed="false">`
      + `${escHtml(t.emoji)} ${escHtml(t.label)}</button>`;
  };

  container.innerHTML = ordered.map(id => pill(id)).join('');
}

// Build genre filter pills ordered by frequency (most common first),
// with the long tail collapsed behind a "More" toggle.
function renderGenrePills(songs) {
  const counts = new Map();
  songs.forEach(s => parseGenres(s.properties || {}).forEach(g => {
    counts.set(g, (counts.get(g) || 0) + 1);
  }));

  const container = document.getElementById('genre-filter');
  if (!container) return;

  const ordered = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const [shown, hidden] = splitTagsByThreshold(ordered, counts);

  const pill = (id, extra = '') =>
    `<button type="button" class="tag-pill genre-pill${extra}" data-genre="${escHtml(id)}" aria-pressed="false">`
    + `${escHtml(id)}</button>`;

  let html = shown.map(id => pill(id)).join('');
  if (hidden.length) {
    html += `<button type="button" id="genre-more" class="tag-more" aria-expanded="false">`
      + `+${hidden.length} more</button>`;
    html += hidden.map(id => pill(id, ' tag-overflow-item')).join('');
    container.classList.add('overflow-collapsed');
  } else {
    container.classList.remove('overflow-collapsed');
  }
  container.innerHTML = html;
}

// Build difficulty filter pills for the bands present in the dataset, ordered
// from easiest to hardest. Multi-select like the tag and genre pills.
function renderDifficultyPills(songs) {
  const present = new Set();
  songs.forEach(s => {
    const band = difficultyBand((s.properties || {}).difficulty);
    if (band) present.add(band);
  });

  const container = document.getElementById('difficulty-filter');
  if (!container) return;

  container.innerHTML = DIFFICULTY_BANDS
    .filter(band => present.has(band))
    .map(band =>
      `<button type="button" class="tag-pill difficulty-pill" data-difficulty="${band}" aria-pressed="false">`
      + `${escHtml(difficultyLabel(band))}</button>`)
    .join('');
}

// Build decade filter pills for the decades present in the dataset, ordered
// chronologically. Sparse early decades (a lone pre-war song) fold into a single
// leading "Pre-<floor>s" bucket pill. Multi-select like the other pills.
function renderDecadePills(songs) {
  const counts = new Map();
  songs.forEach(s => {
    const band = decadeBand((s.properties || {}).year);
    if (band) counts.set(band, (counts.get(band) || 0) + 1);
  });

  const container = document.getElementById('decade-filter');
  if (!container) return;

  decadeFloorYear = decadeFloor(counts);

  // Bucket pill first (when there are sparse old decades to fold), then each
  // decade from the floor onward, ascending.
  const values = [];
  if (decadeFloorYear != null) values.push(`${PRE_DECADE_PREFIX}${decadeFloorYear}`);
  [...counts.keys()]
    .map(Number)
    .filter(d => decadeFloorYear == null || d >= decadeFloorYear)
    .sort((a, b) => a - b)
    .forEach(d => values.push(String(d)));

  container.innerHTML = values.map(v =>
    `<button type="button" class="tag-pill decade-pill" data-decade="${escHtml(v)}" aria-pressed="false">`
    + `${escHtml(decadeFilterLabel(v))}</button>`).join('');
}

function render() {
  const filters  = getFilters();
  syncUrl(filters);
  const filtered = applyFilters(allSongs, lunrIndex, allSongs, filters);
  const sorted   = sortSongs(filtered, filters.sort);

  document.getElementById('result-count').innerHTML =
    `Showing <strong>${sorted.length.toLocaleString()}</strong> of
     <strong>${allSongs.length.toLocaleString()}</strong> songs`;

  const container = document.getElementById('results');
  if (sorted.length === 0) {
    container.innerHTML = '<div class="no-results">No songs match your search. Try different terms or clear the filters.</div>';
  } else {
    container.innerHTML = sorted.map(s => renderCard(s)).join('');
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    allSongs = await fetchSongs();

    lunrIndex = buildIndex(allSongs);

    renderDifficultyPills(allSongs);
    renderDecadePills(allSongs);
    renderCountryPills(allSongs);
    renderThemePills(allSongs);
    renderGenrePills(allSongs);

    applyInitialFilters();

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
document.getElementById('sort-by').addEventListener('change', render);

document.getElementById('difficulty-filter').addEventListener('click', (e) => {
  const pill = e.target.closest('.difficulty-pill');
  if (!pill) return;
  const band = pill.dataset.difficulty;
  setFilterActive('difficulty', band, !activeDifficulties.has(band));
  render();
});

document.getElementById('decade-filter').addEventListener('click', (e) => {
  const pill = e.target.closest('.decade-pill');
  if (!pill) return;
  const decade = pill.dataset.decade;
  setFilterActive('decade', decade, !activeDecades.has(decade));
  render();
});

document.getElementById('country-filter').addEventListener('click', (e) => {
  const more = e.target.closest('#country-more');
  if (more) {
    const container = document.getElementById('country-filter');
    const collapsed = container.classList.toggle('overflow-collapsed');
    more.setAttribute('aria-expanded', String(!collapsed));
    more.textContent = collapsed
      ? `+${container.querySelectorAll('.tag-overflow-item').length} more`
      : 'Show less';
    return;
  }

  const pill = e.target.closest('.country-pill');
  if (!pill) return;
  const country = pill.dataset.country;
  setFilterActive('country', country, !activeCountries.has(country));
  render();
});

document.getElementById('theme-filter').addEventListener('click', (e) => {
  const pill = e.target.closest('.theme-pill');
  if (!pill) return;
  const theme = pill.dataset.theme;
  setFilterActive('theme', theme, !activeThemes.has(theme));
  render();
});

document.getElementById('genre-filter').addEventListener('click', (e) => {
  const more = e.target.closest('#genre-more');
  if (more) {
    const container = document.getElementById('genre-filter');
    const collapsed = container.classList.toggle('overflow-collapsed');
    more.setAttribute('aria-expanded', String(!collapsed));
    more.textContent = collapsed
      ? `+${container.querySelectorAll('.tag-overflow-item').length} more`
      : 'Show less';
    return;
  }

  const pill = e.target.closest('.genre-pill');
  if (!pill) return;
  const genre = pill.dataset.genre;
  setFilterActive('genre', genre, !activeGenres.has(genre));
  render();
});

// Clickable card chips (country / theme / genre) act as filter toggles. They
// live inside the card's <a>, so we stop the click from navigating to the sheet.
function toggleChip(chip) {
  const type  = chip.dataset.filterType;
  const value = chip.dataset.filterValue;
  const group = FILTER_GROUPS[type];
  if (!group) return;
  setFilterActive(type, value, !group.set.has(value));
  render();
}

const resultsEl = document.getElementById('results');
resultsEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-clickable');
  if (!chip) return;
  e.preventDefault();
  e.stopPropagation();
  toggleChip(chip);
});
resultsEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const chip = e.target.closest('.chip-clickable');
  if (!chip) return;
  e.preventDefault();
  toggleChip(chip);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('search').value  = '';
  document.getElementById('sort-by').value = 'title';
  activeDifficulties.clear();
  activeDecades.clear();
  activeCountries.clear();
  activeThemes.clear();
  activeGenres.clear();
  document.querySelectorAll('.difficulty-pill.active, .decade-pill.active, .country-pill.active, .theme-pill.active, .genre-pill.active').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-pressed', 'false');
  });
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
