import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  getStoredAnalyticsConsent,
  sanitizePageLocation,
  setStoredAnalyticsConsent,
} from '../src/lib/landing-analytics.mjs';

function createWindow() {
  const values = new Map();

  return {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
}

test('keeps only campaign parameters in manual page-view locations', () => {
  assert.equal(
    sanitizePageLocation({
      href: 'https://landing.example/pricing?email=person%40example.com&utm_source=newsletter&utm_campaign=launch&query=secret#details',
    }),
    'https://landing.example/pricing?utm_source=newsletter&utm_campaign=launch',
  );
});

test('persists only recognised analytics-consent choices', () => {
  const windowObject = createWindow();

  assert.equal(getStoredAnalyticsConsent(windowObject), null);
  setStoredAnalyticsConsent(windowObject, 'granted');
  assert.equal(getStoredAnalyticsConsent(windowObject), 'granted');
  windowObject.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'unexpected');
  assert.equal(getStoredAnalyticsConsent(windowObject), null);
  setStoredAnalyticsConsent(windowObject, 'denied');
  assert.equal(getStoredAnalyticsConsent(windowObject), 'denied');
});

test('treats unavailable local storage as an unset consent choice', () => {
  assert.equal(
    getStoredAnalyticsConsent({
      localStorage: {
        getItem() {
          throw new Error('Storage access is blocked.');
        },
      },
    }),
    null,
  );
});
