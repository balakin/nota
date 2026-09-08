export type Page = 'train' | 'learning' | 'progress' | 'settings' | 'research';

export const PAGES: readonly Page[] = [
  'train',
  'learning',
  'progress',
  'settings',
  'research',
];

export function pageFromHash(hash: string): Page {
  const candidate = hash.replace(/^#/, '') as Page;
  return PAGES.includes(candidate) ? candidate : 'train';
}
