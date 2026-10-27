import { AppError } from '@/lib/domain/errors';
import type { CatalogItem, SearchDeps, SearchRows } from '@/lib/domain/search/ports';
import {
  normalizeKeyword,
  safeSlug,
  type SearchGroup,
  type SearchItem,
  type SearchPage,
  type SearchType,
} from '@/lib/domain/search/types';

const GROUPS: SearchGroup[] = ['facilities', 'specialties', 'doctors', 'posts'];
const EMPTY_TOTALS = (): Record<SearchGroup, number> => ({
  facilities: 0,
  specialties: 0,
  doctors: 0,
  posts: 0,
});
const EMPTY_GROUPS = (): Record<SearchGroup, SearchItem[]> => ({
  facilities: [],
  specialties: [],
  doctors: [],
  posts: [],
});

function catalogRows(
  list: CatalogItem[],
  type: 'specialties' | 'doctors',
  term: string,
  skip: number,
  take: number,
): SearchRows {
  const seen = new Set<string>();
  const matches: SearchItem[] = [];
  for (const entry of list) {
    if (!normalizeKeyword(entry.name).includes(term)) continue;
    const facilitySlug = entry.facilitySlug && safeSlug(entry.facilitySlug);
    const code = entry.code && /^[\w-]{1,80}$/.test(entry.code) ? entry.code : undefined;
    const slug = safeSlug(entry.slug || entry.name);
    const href =
      type === 'specialties'
        ? `/chuyen-khoa/${encodeURIComponent(slug)}`
        : facilitySlug && code
          ? `/co-so/${encodeURIComponent(facilitySlug)}/bac-si/${encodeURIComponent(code)}`
          : `/bac-si?ten=${encodeURIComponent(entry.name)}`;
    const key =
      type === 'specialties' ? slug : `${normalizeKeyword(entry.name)}:${facilitySlug ?? ''}:${code ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      type,
      title: entry.name,
      href,
      ...(entry.specialty ? { description: entry.specialty } : {}),
      ...(entry.facilityName ? { context: entry.facilityName } : {}),
    });
  }
  matches.sort((a, b) => {
    const aPrefix = normalizeKeyword(a.title).startsWith(term) ? 0 : 1;
    const bPrefix = normalizeKeyword(b.title).startsWith(term) ? 0 : 1;
    return aPrefix - bPrefix || a.title.localeCompare(b.title, 'vi');
  });
  return { items: matches.slice(skip, skip + take), total: matches.length };
}

export class SearchService {
  constructor(private readonly deps: SearchDeps) {}

  async search(input: { q: string; type: SearchType; page: number; ipHash: string }): Promise<SearchPage> {
    return this.run(input, false);
  }

  async suggest(q: string, ipHash: string): Promise<SearchPage> {
    return this.run({ q, type: 'all', page: 1, ipHash }, true);
  }

  private async run(
    input: { q: string; type: SearchType; page: number; ipHash: string },
    suggest: boolean,
  ): Promise<SearchPage> {
    const term = normalizeKeyword(input.q);
    if (term.length < 2) throw new AppError('VALIDATION_FAILED', 'Vui lòng nhập ít nhất 2 ký tự');
    // W05 mục 3: API và trang SSR cùng dùng một hạn mức theo IP đã băm.
    const limit = await this.deps.limiter.hit(`search:${input.ipHash}`, 30, 60);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');

    const pageSize = suggest || input.type === 'all' ? 5 : 10;
    const skip = (input.page - 1) * pageSize;
    const active = input.type === 'all' ? GROUPS : [input.type];
    const results = await Promise.all(active.map((group) => this.loadGroup(group, term, skip, pageSize)));
    const groups = EMPTY_GROUPS();
    const totals = EMPTY_TOTALS();
    active.forEach((group, i) => {
      groups[group] = results[i]!.items;
      totals[group] = results[i]!.total;
    });
    const total = Object.values(totals).reduce((sum, count) => sum + count, 0);

    // search_log phục vụ A10; chỉ ghi từ khóa chữ, tránh lưu SĐT/CCCD/email người dùng nhập nhầm.
    if (!suggest && /^[a-z ]{2,80}$/.test(term)) await this.deps.repository.log(term, total);
    return { query: input.q.trim(), type: input.type, page: input.page, pageSize, total, totals, groups };
  }

  private async loadGroup(group: SearchGroup, term: string, skip: number, take: number): Promise<SearchRows> {
    if (group === 'facilities') return this.deps.repository.facilities(term, skip, take);
    if (group === 'posts') return this.deps.repository.posts(term, skip, take);
    const list =
      group === 'specialties' ? await this.deps.catalog.specialties() : await this.deps.catalog.doctors();
    return catalogRows(list, group, term, skip, take);
  }
}
