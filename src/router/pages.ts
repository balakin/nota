export type Page = 'train' | 'progress' | 'settings';

export const PAGES: readonly Page[] = ['train', 'progress', 'settings'];

export function pageFromHash(hash: string): Page {
  const candidate = hash.replace(/^#/, '') as Page;
  return PAGES.includes(candidate) ? candidate : 'train';
}
