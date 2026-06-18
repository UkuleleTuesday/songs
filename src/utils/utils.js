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
// Themed/seasonal collections a song can belong to. Source data lives in the
// comma-separated `properties.specialbooks` field. Insertion order here is the
// display order of the filter pills.

export const TAG_DEFS = {
  usa:        { id: 'usa',        emoji: '🇺🇸', label: 'USA' },
  uk:         { id: 'uk',         emoji: '🇬🇧', label: 'UK' },
  ireland:    { id: 'ireland',    emoji: '☘️',  label: 'Ireland' },
  pride:      { id: 'pride',      emoji: '🏳️‍🌈', label: 'Pride' },
  valentines: { id: 'valentines', emoji: '💘',  label: "Valentine's" },
  womens:     { id: 'womens',     emoji: '♀️',  label: "Women's" },
  halloween:  { id: 'halloween',  emoji: '🎃',  label: 'Halloween' },
  xmas:       { id: 'xmas',       emoji: '🎄',  label: 'Christmas' },
};

// Tags present in the data but deliberately not surfaced in the UI:
// `regular` is the default (most songs) so adds no signal; `hooley-2025` is a
// stale one-off event. They stay in the data and search index untouched.
export const HIDDEN_TAGS = new Set(['regular', 'hooley-2025']);

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
