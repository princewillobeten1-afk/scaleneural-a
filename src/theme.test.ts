import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScrollProgress,
  formatAuditSuccessMessage,
  getNextTheme,
  getThemeToggleMeta,
  isValidTheme,
  resolveTheme,
  shouldShowBackToTop,
  toggleFaqItem,
} from './theme';
import {
  clampExplodeFactor,
  dampValue,
  getCameraPreset,
  getFinishPreset,
  WORKFLOW_NODES,
} from './scene/presets';

test('isValidTheme accepts only light and dark', () => {
  assert.equal(isValidTheme('dark'), true);
  assert.equal(isValidTheme('light'), true);
  assert.equal(isValidTheme('system'), false);
  assert.equal(isValidTheme(null), false);
  assert.equal(isValidTheme(undefined), false);
});

test('resolveTheme uses stored theme when valid and defaults to dark otherwise', () => {
  assert.equal(resolveTheme('light'), 'light');
  assert.equal(resolveTheme('dark'), 'dark');
  assert.equal(resolveTheme(null), 'dark');
  assert.equal(resolveTheme(undefined), 'dark');
  assert.equal(resolveTheme('invalid'), 'dark');
  assert.equal(resolveTheme('invalid', 'light'), 'light');
});

test('getNextTheme toggles between dark and light', () => {
  assert.equal(getNextTheme('dark'), 'light');
  assert.equal(getNextTheme('light'), 'dark');
});

test('getThemeToggleMeta exposes accessible labels and pressed state', () => {
  assert.deepEqual(getThemeToggleMeta('dark'), {
    current: 'dark',
    next: 'light',
    ariaLabel: 'Switch to light mode',
    title: 'Switch to light mode',
    pressed: false,
  });

  assert.deepEqual(getThemeToggleMeta('light'), {
    current: 'light',
    next: 'dark',
    ariaLabel: 'Switch to dark mode',
    title: 'Switch to dark mode',
    pressed: true,
  });
});

test('formatAuditSuccessMessage greets using first name safely', () => {
  assert.equal(
    formatAuditSuccessMessage('  Ada Lovelace '),
    'Thanks, Ada — your audit request has been received.'
  );
  assert.equal(
    formatAuditSuccessMessage('   '),
    'Thanks — your audit request has been received.'
  );
});

test('calculateScrollProgress computes normalized progress and clamps overscroll', () => {
  assert.equal(calculateScrollProgress(0, 2000, 800), 0);
  assert.equal(calculateScrollProgress(600, 2000, 800), 0.5);
  assert.equal(calculateScrollProgress(1200, 2000, 800), 1);
  assert.equal(calculateScrollProgress(-40, 2000, 800), 0);
  assert.equal(calculateScrollProgress(1500, 2000, 800), 1);
  assert.equal(calculateScrollProgress(100, 800, 800), 0);
  assert.equal(calculateScrollProgress(100, 600, 800), 0);
});

test('3D studio preset helpers resolve valid presets and clamp explode ratios', () => {
  assert.equal(clampExplodeFactor(-0.5), 0);
  assert.equal(clampExplodeFactor(0.45), 0.45);
  assert.equal(clampExplodeFactor(2), 1);
  assert.equal(clampExplodeFactor(Number.NaN), 0);

  assert.equal(getCameraPreset('core').id, 'core');
  assert.equal(getCameraPreset('unknown').id, 'overview');

  assert.equal(getFinishPreset('gold').id, 'gold');
  assert.equal(getFinishPreset('unknown').id, 'titanium');

  assert.equal(WORKFLOW_NODES.length, 6);
  const damped = dampValue(0, 10, 8, 0.016);
  assert.ok(damped > 0 && damped < 10);
  assert.equal(dampValue(3, 10, 8, 0), 3);
});

test('shouldShowBackToTop reveals only after scrolling past hero section', () => {
  assert.equal(shouldShowBackToTop(800, 0, true), false);
  assert.equal(shouldShowBackToTop(400, 400, true), false);
  assert.equal(shouldShowBackToTop(120, 700, true), true);
  assert.equal(shouldShowBackToTop(-240, 1060, true), true);
  assert.equal(shouldShowBackToTop(0, 250, false), false);
  assert.equal(shouldShowBackToTop(0, 450, false), true);
});

test('toggleFaqItem opens selected item and collapses when clicked again', () => {
  assert.equal(toggleFaqItem(0, 2), 2);
  assert.equal(toggleFaqItem(2, 2), null);
  assert.equal(toggleFaqItem(null, 1), 1);
});
