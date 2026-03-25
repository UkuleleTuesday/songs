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

function difficultyBand(val) {
  if (val == null || val === "") return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (n <= 2.0) return "easy";
  if (n <= 3.5) return "medium";
  return "hard";
}

const STATUS_LABELS = {
  APPROVED:      "Approved",
  READY_TO_PLAY: "Ready to play",
  DRAFT:         "Draft",
  REJECTED:      "Rejected",
};

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isNewSong(readyToPlayDate) {
  if (!readyToPlayDate) return false;
  const d = new Date(readyToPlayDate);
  if (isNaN(d)) return false;
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return d >= twoMonthsAgo;
}

if (typeof module !== 'undefined') module.exports = { slugify, difficultyBand, STATUS_LABELS, escHtml, isNewSong };
