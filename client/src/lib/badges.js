// Badge helpers shared across pages.

import { apiRequest } from './api';

const EVENT = 'codesphere:badges';

// Show the celebration toast for newly earned badges (from any page).
export function celebrateBadges(badges) {
  if (!badges?.length) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: badges }));
}

export function onBadgesEarned(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

// The badge catalog rarely changes, so fetch it once per page load.
let catalogPromise = null;
export function loadBadgeCatalog() {
  if (!catalogPromise) {
    catalogPromise = apiRequest('/badges/catalog').catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

export const TIER_LABELS = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', legend: 'Legend' };
