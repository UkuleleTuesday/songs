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

// ── Tags (formerly "specialbooks") ──────────────────────────────────────────
// Themed/seasonal/regional collections a song can belong to. Source data lives
// in the comma-separated `properties.specialbooks` field. Insertion order here
// is the display order of the filter pills. Keys must match the raw tag value
// exactly (lowercased, spaces preserved), e.g. 'new zealand', 'puerto rico'.

export const TAG_DEFS = {
  // Themed / seasonal collections.
  usa:        { id: 'usa',        emoji: '🇺🇸', label: 'USA' },
  uk:         { id: 'uk',         emoji: '🇬🇧', label: 'UK' },
  ireland:    { id: 'ireland',    emoji: '☘️',  label: 'Ireland' },
  pride:      { id: 'pride',      emoji: '🏳️‍🌈', label: 'Pride' },
  valentines: { id: 'valentines', emoji: '💘',  label: "Valentine's" },
  womens:     { id: 'womens',     emoji: '♀️',  label: "Women's" },
  halloween:  { id: 'halloween',  emoji: '🎃',  label: 'Halloween' },
  xmas:       { id: 'xmas',       emoji: '🎄',  label: 'Christmas' },
  // Country / region collections (mostly the collapsed long tail).
  canada:        { id: 'canada',        emoji: '🇨🇦', label: 'Canada' },
  france:        { id: 'france',        emoji: '🇫🇷', label: 'France' },
  italy:         { id: 'italy',         emoji: '🇮🇹', label: 'Italy' },
  australia:     { id: 'australia',     emoji: '🇦🇺', label: 'Australia' },
  sweden:        { id: 'sweden',        emoji: '🇸🇪', label: 'Sweden' },
  scotland:      { id: 'scotland',      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: 'Scotland' },
  scottish:      { id: 'scottish',      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', label: 'Scottish' },
  peace:         { id: 'peace',         emoji: '☮️',  label: 'Peace' },
  hawaii:        { id: 'hawaii',        emoji: '🌺', label: 'Hawaii' },
  japan:         { id: 'japan',         emoji: '🇯🇵', label: 'Japan' },
  'puerto rico': { id: 'puerto rico',   emoji: '🇵🇷', label: 'Puerto Rico' },
  spain:         { id: 'spain',         emoji: '🇪🇸', label: 'Spain' },
  wales:         { id: 'wales',         emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', label: 'Wales' },
  colombia:      { id: 'colombia',      emoji: '🇨🇴', label: 'Colombia' },
  germany:       { id: 'germany',       emoji: '🇩🇪', label: 'Germany' },
  netherlands:   { id: 'netherlands',   emoji: '🇳🇱', label: 'Netherlands' },
  'new zealand': { id: 'new zealand',   emoji: '🇳🇿', label: 'New Zealand' },
  norway:        { id: 'norway',        emoji: '🇳🇴', label: 'Norway' },
  russia:        { id: 'russia',        emoji: '🇷🇺', label: 'Russia' },
};

// Tags present in the data but deliberately not surfaced in the UI:
// `regular` is the default (most songs) so adds no signal; `hooley-2025`,
// `womens-2026`, `can2025` and `nocan2025` are stale one-off / artifact values.
// They stay in the data and search index untouched.
export const HIDDEN_TAGS = new Set([
  'regular', 'hooley-2025', 'womens-2026', 'can2025', 'nocan2025',
]);

function humanizeTag(id) {
  return String(id)
    .split('-')
    .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

export function getTag(id) {
  return TAG_DEFS[id] || { id, emoji: '🏷️', label: humanizeTag(id) };
}

export function parseTags(props) {
  return ((props || {}).specialbooks || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !HIDDEN_TAGS.has(t));
}

export function renderTag(id, { iconOnly = false } = {}) {
  const tag = getTag(id);
  const content = iconOnly ? escHtml(tag.emoji) : `${escHtml(tag.emoji)} ${escHtml(tag.label)}`;
  return `<span class="chip chip-tag" title="${escHtml(tag.label)}">${content}</span>`;
}

// Tags matching more than this many songs are shown as filter pills by default;
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
