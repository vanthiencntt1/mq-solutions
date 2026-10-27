import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/domain/errors';

const mocked = vi.hoisted(() => ({
  search: vi.fn(),
  suggest: vi.fn(),
}));

vi.mock('@/lib/services/search', () => ({
  getSearchService: () => mocked,
}));
vi.mock('@/app/_lib/session', () => ({
  requestCtx: () => ({ ipHash: 'fake-ip-hash' }),
}));

import { GET as searchGet } from '@/app/api/search/route';
import { GET as suggestGet } from '@/app/api/search/suggest/route';

const result = {
  query: 'nhi',
  type: 'all',
  page: 1,
  pageSize: 5,
  total: 1,
  totals: { facilities: 1, specialties: 0, doctors: 0, posts: 0 },
  groups: {
    facilities: [{ type: 'facilities', title: 'Bệnh viện Nhi', href: '/co-so/benh-vien-nhi' }],
    specialties: [],
    doctors: [],
    posts: [],
  },
};

describe('W05 API', () => {
  beforeEach(() => {
    mocked.search.mockReset().mockResolvedValue(result);
    mocked.suggest.mockReset().mockResolvedValue(result);
  });

  it('GET /api/search trả nhóm kết quả và metadata', async () => {
    const response = await searchGet(new Request('http://localhost/api/search?q=nhi'), undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: result, meta: { page: 1, pageSize: 5, total: 1 } });
    expect(mocked.search).toHaveBeenCalledWith({ q: 'nhi', type: 'all', page: 1, ipHash: 'fake-ip-hash' });
  });

  it('GET /api/search kiểm type và page bằng Zod', async () => {
    const response = await searchGet(
      new Request('http://localhost/api/search?q=nhi&type=wrong&page=0'),
      undefined,
    );
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('VALIDATION_FAILED');
    expect(mocked.search).not.toHaveBeenCalled();
  });

  it('GET /api/search/suggest trả tối đa dữ liệu service và chuyển 429', async () => {
    const response = await suggestGet(new Request('http://localhost/api/search/suggest?q=nhi'), undefined);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(result);
    expect(mocked.suggest).toHaveBeenCalledWith('nhi', 'fake-ip-hash');
    mocked.suggest.mockRejectedValueOnce(new AppError('RATE_LIMITED'));
    const limited = await suggestGet(new Request('http://localhost/api/search/suggest?q=nhi'), undefined);
    expect(limited.status).toBe(429);
  });
});
