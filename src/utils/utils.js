export function slugify(text) {
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

export function difficultyBand(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (n <= 2.0) return "easy";
  if (n <= 3.5) return "medium";
  return "hard";
}

export function difficultyLabel(band) {
  if (band === "easy")   return "Beginner";
  if (band === "medium") return "Intermediate";
  if (band === "hard")   return "Advanced";
  return null;
}

// Difficulty bands in ascending order — the display order of the filter pills.
export const DIFFICULTY_BANDS = ["easy", "medium", "hard"];

// ── Decades ───────────────────────────────────────────────────────────────────
// Source: `properties.year` (a 4-digit year string). Each song maps to a single
// decade band, keyed by the decade's start year as a string (e.g. "1980"). The
// pill label is the conventional "1980s". Outlier decades (a lone pre-war song)
// fall into the "More" collapse automatically via splitTagsByThreshold.

export function decadeBand(year) {
  if (year == null || year === "") return null;
  const n = parseInt(year, 10);
  if (isNaN(n)) return null;
  return String(Math.floor(n / 10) * 10);
}

export function decadeLabel(band) {
  if (band == null || band === "") return null;
  const n = parseInt(band, 10);
  if (isNaN(n)) return null;
  return `${n}s`;
}

// Sparse early decades (a lone pre-war song or two) don't each deserve a pill,
// so the decades older than the first well-populated one fold into a single
// "before" bucket. Its filter value is `pre-<floor>` (e.g. "pre-1960").
export const PRE_DECADE_PREFIX = "pre-";

// Pick the floor decade: the earliest decade whose count clears `min`. Decades
// older than the floor are the sparse tail that gets bucketed. Returns the
// floor decade-start (a number) — or null when there's nothing to fold (no
// decade clears the threshold, or the earliest decade is already the floor).
export function decadeFloor(counts, min = TAG_PILL_MIN_COUNT) {
  const countOf = id => (counts instanceof Map ? counts.get(id) : counts[id]) || 0;
  const decades = (counts instanceof Map ? [...counts.keys()] : Object.keys(counts))
    .map(Number)
    .sort((a, b) => a - b);
  if (!decades.length) return null;
  const firstStrong = decades.find(d => countOf(String(d)) > min);
  if (firstStrong == null) return null;
  return decades.some(d => d < firstStrong) ? firstStrong : null;
}

export function isPreDecadeBucket(value) {
  return typeof value === "string" && value.startsWith(PRE_DECADE_PREFIX);
}

// Map a year to its decade filter value, given the computed floor. Years older
// than the floor collapse to the shared bucket value; everything else maps to
// its own decade band.
export function decadeFilterBand(year, floor) {
  const band = decadeBand(year);
  if (band == null) return null;
  if (floor != null && Number(band) < floor) return `${PRE_DECADE_PREFIX}${floor}`;
  return band;
}

// Pill label for any decade filter value — the "Pre-1960s" bucket or a plain
// "1980s" decade.
export function decadeFilterLabel(value) {
  if (isPreDecadeBucket(value)) {
    const floor = parseInt(value.slice(PRE_DECADE_PREFIX.length), 10);
    return isNaN(floor) ? null : `Pre-${floor}s`;
  }
  return decadeLabel(value);
}

export const STATUS_LABELS = {
  APPROVED:      "Approved",
  READY_TO_PLAY: "Ready to play",
  DRAFT:         "Draft",
  REJECTED:      "Rejected",
};

export function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Badge data model ──────────────────────────────────────────────────────────
// Each badge: { id, label, icon, tooltip }

export const BADGE_DEFS = {
  new: {
    id:      'new',
    label:   'New',
    icon:    '✨',
    tooltip: 'Added to the songbook in the last 2 months',
  },
  wip: {
    id:      'wip',
    label:   'Work In Progress',
    icon:    '🚧',
    tooltip: 'This song is not yet final — chords or lyrics may change',
  },
};

export function isNewSong(readyToPlayDate) {
  if (!readyToPlayDate) return false;
  const d = new Date(readyToPlayDate);
  if (isNaN(d)) return false;
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return d >= twoMonthsAgo;
}

export function buildBadges(props) {
  const badges = [];
  if (isNewSong(props.ready_to_play_date)) badges.push(BADGE_DEFS.new);
  if (props.status === 'READY_TO_PLAY')    badges.push(BADGE_DEFS.wip);
  return badges;
}

export function renderBadge(badge, { iconOnly = false } = {}) {
  const content = iconOnly ? escHtml(badge.icon) : `${escHtml(badge.icon)} ${escHtml(badge.label)}`;
  return `<span class="chip chip-${escHtml(badge.id)}" title="${escHtml(badge.tooltip)}">${content}</span>`;
}

// ── Countries ─────────────────────────────────────────────────────────────────
// Source: `properties.country` (comma-separated full country names, lowercase).
// Insertion order sets the display order for filter pills; less-common countries
// fall through to the "More" collapse automatically via splitTagsByThreshold.

export const COUNTRY_DEFS = {
  'united states':      { emoji: '🇺🇸', label: 'United States' },
  'united kingdom':     { emoji: '🇬🇧', label: 'United Kingdom' },
  'ireland':            { emoji: '🇮🇪', label: 'Ireland' },
  'canada':             { emoji: '🇨🇦', label: 'Canada' },
  'england':            { emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', label: 'England' },
  'france':             { emoji: '🇫🇷', label: 'France' },
  'italy':              { emoji: '🇮🇹', label: 'Italy' },
  'australia':          { emoji: '🇦🇺', label: 'Australia' },
  'sweden':             { emoji: '🇸🇪', label: 'Sweden' },
  'spain':              { emoji: '🇪🇸', label: 'Spain' },
  'scotland':           { emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: 'Scotland' },
  'wales':              { emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', label: 'Wales' },
  'northern ireland':   { emoji: '🇬🇧', label: 'Northern Ireland' },
  'germany':            { emoji: '🇩🇪', label: 'Germany' },
  'netherlands':        { emoji: '🇳🇱', label: 'Netherlands' },
  'norway':             { emoji: '🇳🇴', label: 'Norway' },
  'new zealand':        { emoji: '🇳🇿', label: 'New Zealand' },
  'puerto rico':        { emoji: '🇵🇷', label: 'Puerto Rico' },
  'hawaii':             { emoji: '🌺',  label: 'Hawaii' },
  'colombia':           { emoji: '🇨🇴', label: 'Colombia' },
  'austria':            { emoji: '🇦🇹', label: 'Austria' },
  'belgium':            { emoji: '🇧🇪', label: 'Belgium' },
  'jamaica':            { emoji: '🇯🇲', label: 'Jamaica' },
  'japan':              { emoji: '🇯🇵', label: 'Japan' },
  'lebanon':            { emoji: '🇱🇧', label: 'Lebanon' },
  'russian federation': { emoji: '🇷🇺', label: 'Russia' },
  'south africa':       { emoji: '🇿🇦', label: 'South Africa' },
  'switzerland':        { emoji: '🇨🇭', label: 'Switzerland' },
  'zimbabwe':           { emoji: '🇿🇼', label: 'Zimbabwe' },
};

// ── Themes ────────────────────────────────────────────────────────────────────
// Source: `properties.theme` (comma-separated theme slugs). Insertion order
// sets the display order of the filter pills.

export const THEME_DEFS = {
  valentines: { emoji: '💘',    label: "Valentine's" },
  pride:      { emoji: '🏳️‍🌈', label: 'Pride' },
  halloween:  { emoji: '🎃',    label: 'Halloween' },
  christmas:  { emoji: '🎄',    label: 'Christmas' },
  peace:      { emoji: '☮️',   label: 'Peace' },
  birthday:   { emoji: '🎂',    label: 'Birthday' },
};

function humanizeId(id) {
  return String(id)
    .split(/[-\s]+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

export function getCountry(id) {
  const def = COUNTRY_DEFS[id];
  return def ? { id, ...def } : { id, emoji: '🌍', label: humanizeId(id) };
}

export function getTheme(id) {
  const def = THEME_DEFS[id];
  return def ? { id, ...def } : { id, emoji: '🏷️', label: humanizeId(id) };
}

export function parseCountry(props) {
  return ((props || {}).country || '').split(',').map(c => c.trim()).filter(Boolean);
}

export function parseTheme(props) {
  return ((props || {}).theme || '').split(',').map(t => t.trim()).filter(Boolean);
}

// When `clickable` is set, the chip carries the class + data attributes the
// explorer uses to turn it into a filter toggle (see explorer.js). Elsewhere
// (e.g. the individual song-sheet page) the chips stay inert.
function filterChip(type, id, baseClass, label, body, clickable) {
  const cls  = clickable ? `chip ${baseClass} chip-clickable` : `chip ${baseClass}`;
  const data = clickable
    ? ` data-filter-type="${escHtml(type)}" data-filter-value="${escHtml(id)}" role="button" tabindex="0"`
    : '';
  return `<span class="${cls}"${data} title="${escHtml(label)}">${body}</span>`;
}

export function renderCountry(id, { clickable = false } = {}) {
  const c = getCountry(id);
  return filterChip('country', id, 'chip-country', c.label, `${escHtml(c.emoji)} ${escHtml(c.label)}`, clickable);
}

export function renderTheme(id, { clickable = false } = {}) {
  const t = getTheme(id);
  return filterChip('theme', id, 'chip-theme', t.label, `${escHtml(t.emoji)} ${escHtml(t.label)}`, clickable);
}

// ── Genres ───────────────────────────────────────────────────────────────────
// Freeform comma-separated genre strings from `properties.genre`.

export function parseGenres(props) {
  return ((props || {}).genre || '')
    .split(',')
    .map(g => g.trim())
    .filter(Boolean);
}

export function renderGenre(id, { clickable = false } = {}) {
  // genres have no emoji — always render as text; label === id
  return filterChip('genre', id, 'chip-genre', id, escHtml(id), clickable);
}

// ── Pill thresholds ───────────────────────────────────────────────────────────
// Pills matching more than this many songs are shown by default;
// the rest are collapsed behind a "More" toggle to keep the filter row tidy.
export const TAG_PILL_MIN_COUNT = 10;

// Partition an ordered list of tag ids into [shown, hidden] for the filter
// pills: tags whose song count exceeds `min` are shown, the rest are hidden
// (collapsed). Order is preserved within each group. If no tag clears the
// threshold, everything is shown so we never collapse the whole row.
export function splitTagsByThreshold(orderedIds, counts, min = TAG_PILL_MIN_COUNT) {
  const countOf = id => (counts instanceof Map ? counts.get(id) : counts[id]) || 0;
  const shown = orderedIds.filter(id => countOf(id) > min);
  if (shown.length === 0) return [orderedIds.slice(), []];
  return [shown, orderedIds.filter(id => countOf(id) <= min)];
}

// Whether activating a filter pill should reveal the collapsed "+N more" tail.
// Only true when the pill being switched on lives in that hidden tail — so a
// filter applied from a shared URL or a clicked card chip stays visible, while
// toggling an already-visible (top-level) pill never auto-expands the overflow.
export function shouldRevealOverflow(active, pillIsInOverflow) {
  return Boolean(active && pillIsInOverflow);
}

// ── Shareable filter state ⇄ URL ───────────────────────────────────────────────
// The explorer's filter state serialises to query-string params so a filtered
// view can be shared as a link (e.g. ?q=perfect&difficulty=easy&country=ireland).
// Multi-select filters use repeated params (?genre=pop&genre=rock) so values
// never collide with a separator. `sort` is omitted when it's the default.

export const DEFAULT_SORT = 'title';

// Each multi-select filter ↔ its URL param name. Order here sets param order.
const FILTER_PARAMS = [
  ['difficulties', 'difficulty'],
  ['decades',      'decade'],
  ['countries',    'country'],
  ['themes',       'theme'],
  ['genres',       'genre'],
];

export function filtersToSearchParams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  for (const [key, param] of FILTER_PARAMS) {
    for (const v of filters[key] || []) params.append(param, v);
  }
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort);
  return params;
}

export function parseFiltersFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const out = {
    query: params.get('q') || '',
    sort:  params.get('sort') || DEFAULT_SORT,
  };
  for (const [key, param] of FILTER_PARAMS) {
    out[key] = params.getAll(param);
  }
  return out;
}
