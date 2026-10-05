import type { Role } from '../lib/types';

/** Portal route → roles allowed. Drives both route guards and the sidebar. */
export const ACCESS: Record<string, Role[]> = {
  '': ['admin', 'manager', 'stakeholder'],
  mail: ['admin', 'manager'], posts: ['admin', 'manager'], gallery: ['admin', 'manager'], services: ['admin', 'manager'],
  staff: ['admin', 'manager'],
  users: ['admin'], projects: ['admin', 'stakeholder'], settings: ['admin'], activity: ['admin'],
  documents: ['stakeholder'], messages: ['stakeholder'], account: ['admin', 'manager', 'stakeholder'],
};
