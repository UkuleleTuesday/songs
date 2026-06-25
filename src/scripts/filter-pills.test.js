// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { expandOverflow, toggleFilterPill } from './filter-pills.js';

// A country filter with two visible pills, a "+2 more" toggle, and two pills
// in the collapsed overflow tail — mirrors what renderCountryPills() produces.
function setupPills() {
  document.body.innerHTML = `
    <div id="country-filter" class="tag-filter overflow-collapsed">
      <button class="tag-pill country-pill" data-country="united states" aria-pressed="false">US</button>
      <button class="tag-pill country-pill" data-country="ireland" aria-pressed="false">IE</button>
      <button id="country-more" class="tag-more" aria-expanded="false">+2 more</button>
      <button class="tag-pill country-pill tag-overflow-item" data-country="italy" aria-pressed="false">IT</button>
      <button class="tag-pill country-pill tag-overflow-item" data-country="wales" aria-pressed="false">WS</button>
    </div>`;
}

const pillOf = value => document.querySelector(`[data-country="${value}"]`);
const container = () => document.getElementById('country-filter');

describe('toggleFilterPill', () => {
  let group;
  beforeEach(() => {
    setupPills();
    group = { set: new Set(), container: 'country-filter', attr: 'country' };
  });

  it('records the value and marks the matching pill active', () => {
    toggleFilterPill(group, 'ireland', true);
    expect(group.set.has('ireland')).toBe(true);
    expect(pillOf('ireland').classList.contains('active')).toBe(true);
    expect(pillOf('ireland').getAttribute('aria-pressed')).toBe('true');
  });

  it('does NOT expand the overflow when a top-level pill is activated (the regression)', () => {
    toggleFilterPill(group, 'united states', true);
    expect(container().classList.contains('overflow-collapsed')).toBe(true);
  });

  it('expands the overflow when a hidden-tail pill is activated', () => {
    toggleFilterPill(group, 'italy', true);
    expect(container().classList.contains('overflow-collapsed')).toBe(false);
    const more = document.getElementById('country-more');
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.textContent).toBe('Show less');
  });

  it('deactivating clears the value/pill and never expands the overflow', () => {
    toggleFilterPill(group, 'italy', true);          // activates + expands
    container().classList.add('overflow-collapsed');  // pretend it was re-collapsed
    toggleFilterPill(group, 'italy', false);
    expect(group.set.has('italy')).toBe(false);
    expect(pillOf('italy').classList.contains('active')).toBe(false);
    expect(container().classList.contains('overflow-collapsed')).toBe(true);
  });

  it('still records the value when no pill matches, without throwing', () => {
    expect(() => toggleFilterPill(group, 'atlantis', true)).not.toThrow();
    expect(group.set.has('atlantis')).toBe(true);
  });

  it('is a no-op for an unknown group', () => {
    expect(() => toggleFilterPill(undefined, 'ireland', true)).not.toThrow();
  });
});

describe('expandOverflow', () => {
  beforeEach(setupPills);

  it('reveals a collapsed container and updates the toggle button', () => {
    expandOverflow(container());
    expect(container().classList.contains('overflow-collapsed')).toBe(false);
    expect(document.getElementById('country-more').textContent).toBe('Show less');
  });

  it('leaves an already-expanded container untouched', () => {
    container().classList.remove('overflow-collapsed');
    const more = document.getElementById('country-more');
    more.textContent = '+2 more';
    expandOverflow(container());
    expect(more.textContent).toBe('+2 more');
  });
});
