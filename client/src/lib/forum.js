import { apiRequest } from './api';

// Forum categories, post types, reasons and limits (fetched once).
let configPromise = null;
export function loadForumConfig() {
  if (!configPromise) {
    configPromise = apiRequest('/forum/config').catch((error) => {
      configPromise = null;
      throw error;
    });
  }
  return configPromise;
}

export const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'helpful', emoji: '💡', label: 'Helpful' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];
