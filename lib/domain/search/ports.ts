import type { SearchItem } from './types';

export interface SearchRows {
  items: SearchItem[];
  total: number;
}

export interface SearchRepository {
  facilities(term: string, skip: number, take: number): Promise<SearchRows>;
  posts(term: string, skip: number, take: number): Promise<SearchRows>;
  log(term: string, results: number): Promise<void>;
}

/** W05 mục 3: danh mục gộp chỉ được đọc từ Redis, không gọi HIS trong lượt tìm kiếm. */
export interface CatalogItem {
  name: string;
  slug?: string;
  facilitySlug?: string;
  facilityName?: string;
  code?: string;
  specialty?: string;
}

export interface SearchCatalog {
  specialties(): Promise<CatalogItem[]>;
  doctors(): Promise<CatalogItem[]>;
}

export interface SearchLimiter {
  hit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }>;
}

export interface SearchDeps {
  repository: SearchRepository;
  catalog: SearchCatalog;
  limiter: SearchLimiter;
}
