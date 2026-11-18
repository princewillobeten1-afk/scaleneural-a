import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAuditSuccessMessage,
  getNextTheme,
  getThemeToggleMeta,
  isValidTheme,
  resolveTheme,
} from './theme';

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
