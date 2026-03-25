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
