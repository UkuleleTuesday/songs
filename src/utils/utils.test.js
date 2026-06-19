import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  slugify,
  difficultyBand,
  difficultyLabel,
  DIFFICULTY_BANDS,
  escHtml,
  isNewSong,
  buildBadges,
  renderBadge,
  BADGE_DEFS,
  COUNTRY_DEFS,
  THEME_DEFS,
  getCountry,
  getTheme,
  parseCountry,
  parseTheme,
  renderCountry,
  renderTheme,
  splitTagsByThreshold,
} from './utils.js';

// ── slugify ────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hey Jude')).toBe('hey-jude');
  });

  it('strips accents', () => {
    expect(slugify('Résumé')).toBe('resume');
  });

  it('removes non-word characters', () => {
    expect(slugify("Don't Stop Me Now")).toBe('dont-stop-me-now');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a  --  b')).toBe('a-b');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('returns "unknown" for empty input', () => {
    expect(slugify('')).toBe('unknown');
    expect(slugify(null)).toBe('unknown');
    expect(slugify(undefined)).toBe('unknown');
  });

  it('truncates to 100 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(100);
  });
});

// ── difficultyBand ─────────────────────────────────────────────────────────

describe('difficultyBand', () => {
  it('returns "easy" for values <= 2.0', () => {
    expect(difficultyBand(1)).toBe('easy');
    expect(difficultyBand(2.0)).toBe('easy');
    expect(difficultyBand('0.81')).toBe('easy');
  });

  it('returns "medium" for values between 2.0 and 3.5', () => {
    expect(difficultyBand(2.1)).toBe('medium');
    expect(difficultyBand(3.5)).toBe('medium');
  });

  it('returns "hard" for values > 3.5', () => {
    expect(difficultyBand(3.51)).toBe('hard');
    expect(difficultyBand(5.03)).toBe('hard');
  });

  it('returns null for missing or invalid values', () => {
    expect(difficultyBand(null)).toBeNull();
    expect(difficultyBand(undefined)).toBeNull();
    expect(difficultyBand('')).toBeNull();
    expect(difficultyBand('abc')).toBeNull();
  });
});

// ── difficultyLabel ────────────────────────────────────────────────────────

describe('difficultyLabel', () => {
  it('returns "Beginner" for easy', () => {
    expect(difficultyLabel('easy')).toBe('Beginner');
  });

  it('returns "Intermediate" for medium', () => {
    expect(difficultyLabel('medium')).toBe('Intermediate');
  });

  it('returns "Advanced" for hard', () => {
    expect(difficultyLabel('hard')).toBe('Advanced');
  });

  it('returns null for unknown or missing band', () => {
    expect(difficultyLabel(null)).toBeNull();
    expect(difficultyLabel(undefined)).toBeNull();
    expect(difficultyLabel('')).toBeNull();
  });
});

// ── DIFFICULTY_BANDS ─────────────────────────────────────────────────────────

describe('DIFFICULTY_BANDS', () => {
  it('lists the bands from easiest to hardest', () => {
    expect(DIFFICULTY_BANDS).toEqual(['easy', 'medium', 'hard']);
  });

  it('contains only bands that difficultyLabel recognises', () => {
    DIFFICULTY_BANDS.forEach(band => {
      expect(difficultyLabel(band)).not.toBeNull();
    });
  });
});

// ── escHtml ────────────────────────────────────────────────────────────────

describe('escHtml', () => {
  it('escapes all special HTML characters', () => {
    expect(escHtml('<script>alert("x\'s")</script> & done')).toBe(
      '&lt;script&gt;alert(&quot;x&#039;s&quot;)&lt;/script&gt; &amp; done'
    );
  });

  it('handles null and undefined gracefully', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });
});

// ── isNewSong ──────────────────────────────────────────────────────────────

describe('isNewSong', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  it('returns true when date is within 2 months', () => {
    expect(isNewSong('2025-05-01')).toBe(true);
    expect(isNewSong('2025-06-15')).toBe(true);
  });

  it('returns false when date is older than 2 months', () => {
    expect(isNewSong('2025-04-14')).toBe(false);
    expect(isNewSong('2024-01-01')).toBe(false);
  });

  it('returns false for missing or invalid dates', () => {
    expect(isNewSong(null)).toBe(false);
    expect(isNewSong('')).toBe(false);
    expect(isNewSong('not-a-date')).toBe(false);
  });
});

// ── buildBadges ────────────────────────────────────────────────────────────

describe('buildBadges', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
  });

  it('returns new badge for a recent song', () => {
    const badges = buildBadges({ ready_to_play_date: '2025-05-01' });
    expect(badges).toContain(BADGE_DEFS.new);
  });

  it('returns wip badge for READY_TO_PLAY status', () => {
    const badges = buildBadges({ status: 'READY_TO_PLAY' });
    expect(badges).toContain(BADGE_DEFS.wip);
  });

  it('returns both badges when applicable', () => {
    const badges = buildBadges({ ready_to_play_date: '2025-05-01', status: 'READY_TO_PLAY' });
    expect(badges).toHaveLength(2);
  });

  it('returns empty array when no badges apply', () => {
    expect(buildBadges({})).toEqual([]);
    expect(buildBadges({ status: 'APPROVED' })).toEqual([]);
  });
});

// ── renderBadge ────────────────────────────────────────────────────────────

describe('renderBadge', () => {
  it('renders icon and label by default', () => {
    const html = renderBadge(BADGE_DEFS.new);
    expect(html).toContain('✨');
    expect(html).toContain('New');
    expect(html).toContain('chip-new');
  });

  it('renders icon only when iconOnly is true', () => {
    const html = renderBadge(BADGE_DEFS.new, { iconOnly: true });
    expect(html).toContain('✨');
    expect(html).not.toContain('New');
  });

  it('includes tooltip in title attribute', () => {
    const html = renderBadge(BADGE_DEFS.wip);
    expect(html).toContain('title=');
    expect(html).toContain('not yet final');
  });
});

// ── getCountry ────────────────────────────────────────────────────────────────

describe('getCountry', () => {
  it('returns a known def with the id attached', () => {
    const c = getCountry('ireland');
    expect(c.id).toBe('ireland');
    expect(c.emoji).toBe(COUNTRY_DEFS.ireland.emoji);
    expect(c.label).toBe('Ireland');
  });

  it('synthesizes a fallback for unknown ids', () => {
    const c = getCountry('narnia');
    expect(c.id).toBe('narnia');
    expect(c.emoji).toBe('🌍');
    expect(c.label).toBe('Narnia');
  });

  it('handles space-containing ids', () => {
    expect(getCountry('new zealand').label).toBe('New Zealand');
    expect(getCountry('puerto rico').emoji).toBe('🇵🇷');
  });
});

// ── getTheme ─────────────────────────────────────────────────────────────────

describe('getTheme', () => {
  it('returns a known def with the id attached', () => {
    const t = getTheme('halloween');
    expect(t.id).toBe('halloween');
    expect(t.emoji).toBe(THEME_DEFS.halloween.emoji);
    expect(t.label).toBe('Halloween');
  });

  it('synthesizes a fallback for unknown ids', () => {
    const t = getTheme('summer-2026');
    expect(t.id).toBe('summer-2026');
    expect(t.emoji).toBe('🏷️');
    expect(t.label).toBe('Summer 2026');
  });
});

// ── parseCountry ──────────────────────────────────────────────────────────────

describe('parseCountry', () => {
  it('splits the comma-separated country field', () => {
    expect(parseCountry({ country: 'united states,ireland' })).toEqual(['united states', 'ireland']);
  });

  it('trims whitespace and drops empties', () => {
    expect(parseCountry({ country: ' ireland , , france ' })).toEqual(['ireland', 'france']);
  });

  it('returns an empty array for missing or empty input', () => {
    expect(parseCountry({})).toEqual([]);
    expect(parseCountry(null)).toEqual([]);
    expect(parseCountry({ country: '' })).toEqual([]);
  });
});

// ── parseTheme ────────────────────────────────────────────────────────────────

describe('parseTheme', () => {
  it('splits the comma-separated theme field', () => {
    expect(parseTheme({ theme: 'pride,valentines' })).toEqual(['pride', 'valentines']);
  });

  it('trims whitespace and drops empties', () => {
    expect(parseTheme({ theme: ' halloween , , christmas ' })).toEqual(['halloween', 'christmas']);
  });

  it('returns an empty array for missing or empty input', () => {
    expect(parseTheme({})).toEqual([]);
    expect(parseTheme(null)).toEqual([]);
    expect(parseTheme({ theme: '' })).toEqual([]);
  });
});

// ── renderCountry ─────────────────────────────────────────────────────────────

describe('renderCountry', () => {
  it('renders emoji and label', () => {
    const html = renderCountry('ireland');
    expect(html).toContain('🇮🇪');
    expect(html).toContain('Ireland');
    expect(html).toContain('chip-country');
  });

  it('uses the label as the title attribute', () => {
    expect(renderCountry('united states')).toContain('title="United States"');
  });

  it('escapes unknown ids', () => {
    const html = renderCountry('<x>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).not.toContain('<x>');
  });
});

// ── renderTheme ───────────────────────────────────────────────────────────────

describe('renderTheme', () => {
  it('renders emoji and label', () => {
    const html = renderTheme('halloween');
    expect(html).toContain('🎃');
    expect(html).toContain('Halloween');
    expect(html).toContain('chip-theme');
  });

  it('uses the label as the title attribute', () => {
    expect(renderTheme('pride')).toContain('title="Pride"');
  });

  it('escapes unknown ids', () => {
    const html = renderTheme('<x>');
    expect(html).toContain('&lt;x&gt;');
    expect(html).not.toContain('<x>');
  });
});

// ── splitTagsByThreshold ─────────────────────────────────────────────────────

describe('splitTagsByThreshold', () => {
  const counts = new Map([['usa', 119], ['pride', 68], ['canada', 12], ['italy', 8], ['wales', 2]]);
  const ordered = ['usa', 'pride', 'canada', 'italy', 'wales'];

  it('shows tags above the threshold and hides the rest, preserving order', () => {
    const [shown, hidden] = splitTagsByThreshold(ordered, counts, 10);
    expect(shown).toEqual(['usa', 'pride', 'canada']);
    expect(hidden).toEqual(['italy', 'wales']);
  });

  it('treats the threshold as strict (count must exceed min)', () => {
    const [shown, hidden] = splitTagsByThreshold(['a', 'b'], new Map([['a', 10], ['b', 11]]), 10);
    expect(shown).toEqual(['b']);
    expect(hidden).toEqual(['a']);
  });

  it('shows everything when no tag clears the threshold', () => {
    const [shown, hidden] = splitTagsByThreshold(['italy', 'wales'], counts, 10);
    expect(shown).toEqual(['italy', 'wales']);
    expect(hidden).toEqual([]);
  });

  it('produces no hidden group when all tags clear the threshold', () => {
    const [shown, hidden] = splitTagsByThreshold(['usa', 'pride'], counts, 10);
    expect(shown).toEqual(['usa', 'pride']);
    expect(hidden).toEqual([]);
  });

  it('defaults missing counts to zero', () => {
    const [shown, hidden] = splitTagsByThreshold(['usa', 'ghost'], counts, 10);
    expect(shown).toEqual(['usa']);
    expect(hidden).toEqual(['ghost']);
  });

  it('accepts a plain object for counts', () => {
    const [shown, hidden] = splitTagsByThreshold(['usa', 'italy'], { usa: 119, italy: 8 }, 10);
    expect(shown).toEqual(['usa']);
    expect(hidden).toEqual(['italy']);
  });
});
