// DOM helpers for the explorer's multi-select filter pills. Kept free of
// top-level side effects (no listeners, no bootstrap) so they can be imported
// and unit-tested against a DOM fixture, unlike explorer.js which wires up the
// page on import.

import { shouldRevealOverflow } from '../utils/utils.js';

// A "group" is { set: Set, container: string (element id), attr: string
// (the pills' data-* attribute name) }.

// Reveal a collapsed "+N more" pill overflow, updating the toggle button to
// match. No-op if the container is already expanded.
export function expandOverflow(container) {
  if (!container || !container.classList.contains('overflow-collapsed')) return;
  container.classList.remove('overflow-collapsed');
  const more = container.querySelector('.tag-more');
  if (more) {
    more.setAttribute('aria-expanded', 'true');
    more.textContent = 'Show less';
  }
}

// Toggle a filter value on/off for one group, keeping the backing Set and the
// matching pill's visual state in sync. Reveals the collapsed overflow only
// when the activated pill lives in the hidden tail, so a filter applied from a
// shared URL or a card chip stays visible — while toggling an already-visible
// pill never auto-expands the overflow. Does not render; callers do.
export function toggleFilterPill(group, value, active) {
  if (!group) return;
  if (active) group.set.add(value); else group.set.delete(value);

  const container = document.getElementById(group.container);
  if (!container) return;
  const pill = [...container.querySelectorAll(`[data-${group.attr}]`)]
    .find(el => el.dataset[group.attr] === value);
  if (pill) {
    pill.classList.toggle('active', active);
    pill.setAttribute('aria-pressed', String(active));
    if (shouldRevealOverflow(active, pill.classList.contains('tag-overflow-item'))) {
      expandOverflow(container);
    }
  }
}
