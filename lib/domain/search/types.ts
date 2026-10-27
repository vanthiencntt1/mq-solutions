export const SEARCH_TYPES = ['all', 'facilities', 'specialties', 'doctors', 'posts'] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];
export type SearchGroup = Exclude<SearchType, 'all'>;

export interface SearchItem {
  type: SearchGroup;
  title: string;
  href: string;
  description?: string;
  context?: string;
}

export interface SearchPage {
  query: string;
  type: SearchType;
  page: number;
  pageSize: number;
  total: number;
  totals: Record<SearchGroup, number>;
  groups: Record<SearchGroup, SearchItem[]>;
}

// W05 mục 2: bỏ dấu cả chữ đ, gom khoảng trắng để SQL và cache so cùng một từ khóa.
export function normalizeKeyword(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (letter) => (letter === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function safeSlug(value: string): string {
  return normalizeKeyword(value).replace(/\s+/g, '-');
}
