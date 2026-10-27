import { describe, expect, it } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminContentService } from '@/lib/services/admin-content/admin-content-service';
import { PostInputSchema, slugify, type AdminContentInput } from '@/lib/domain/content/admin-schemas';
import type { AdminContentRepository } from '@/lib/domain/content/admin-ports';

const ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY = '22222222-2222-4222-8222-222222222222';
const VERSION = '33333333-3333-4333-8333-333333333333';
const actor: AdminPrincipal = {
  id: ID,
  role: 'EDITOR',
  name: 'Biên tập',
  facilityIds: null,
  permissions: ['content:read', 'content:write'],
};
const now = new Date('2026-10-27T08:00:00.000Z');

function post(overrides: Record<string, unknown> = {}): AdminContentInput {
  return {
    kind: 'posts',
    value: PostInputSchema.parse({
      title: 'Khám bệnh định kỳ',
      categoryId: CATEGORY,
      status: 'DRAFT',
      blocks: [{ type: 'paragraph', content: [{ text: 'Nội dung mẫu' }] }],
      ...overrides,
    }),
  };
}

function fake() {
  const saved: { input: AdminContentInput; action?: string }[] = [];
  const invalidated: string[] = [];
  let row: unknown = null;
  let historical: unknown = null;
  let duplicate = false;
  const repo: AdminContentRepository = {
    list: async () => ({ rows: [], total: 0 }),
    find: async () => row,
    slugExists: async () => duplicate,
    category: async () => ({ slug: 'tin-y-te' }),
    save: async (input, _id, _actor, action) => {
      saved.push({ input, action });
      row = { id: ID, ...input.value };
      return { id: ID, slug: 'slug' in input.value ? input.value.slug : undefined };
    },
    remove: async () => {
      row = null;
    },
    versions: async () => [{ id: VERSION, createdAt: now, createdBy: ID }],
    version: async () => historical,
    mediaCreate: async (data) => ({ id: ID, url: data.url }),
    mediaList: async () => ({ rows: [], total: 0 }),
  };
  const service = new AdminContentService({
    repo,
    storage: {
      save: async ({ mime }) => ({
        key: '2026/10/image.png',
        url: '/uploads/2026/10/image.png',
        mime,
        size: 8,
      }),
    },
    revalidate: (path) => invalidated.push(path),
    now: () => now,
  });
  return {
    service,
    saved,
    invalidated,
    setRow: (value: unknown) => {
      row = value;
    },
    setVersion: (value: unknown) => {
      historical = value;
    },
    setDuplicate: () => {
      duplicate = true;
    },
  };
}

describe('A04 quản lý nội dung', () => {
  it('bỏ dấu khi tạo slug và từ chối slug trùng', async () => {
    expect(slugify('Đặt Khám Ở Đà Nẵng!')).toBe('dat-kham-o-da-nang');
    const f = fake();
    f.setDuplicate();
    await expect(f.service.save(actor, post())).rejects.toMatchObject({ code: 'CONTENT_SLUG_EXISTS' });
    expect(f.saved).toHaveLength(0);
  });

  it('chỉ xuất bản bài y khoa khi có người duyệt; bỏ HTML và làm mới trang công khai', async () => {
    const f = fake();
    await expect(f.service.save(actor, post({ status: 'PUBLISHED' }))).rejects.toMatchObject({
      code: 'CONTENT_REVIEWER_REQUIRED',
    });
    const input = post({
      status: 'PUBLISHED',
      reviewerName: 'Bác sĩ A',
      blocks: [{ type: 'paragraph', content: [{ text: 'An toàn<script>alert(1)</script><b>đọc</b>' }] }],
    });
    await f.service.save(actor, input);
    const saved = f.saved[0]?.input;
    expect(saved?.kind).toBe('posts');
    if (saved?.kind !== 'posts') throw new Error('Sai loại');
    expect(saved.value.slug).toBe('kham-benh-dinh-ky');
    expect(saved.value.publishedAt).toBe(now.toISOString());
    expect(saved.value.blocks[0]).toMatchObject({ content: [{ text: 'An toànđọc' }] });
    expect(f.invalidated).toContain('/tin-tuc/kham-benh-dinh-ky');
  });

  it('hẹn giờ phải ở tương lai và phiên bản cũ khôi phục qua cùng quy tắc xuất bản', async () => {
    const f = fake();
    await expect(
      f.service.save(
        actor,
        post({ status: 'SCHEDULED', reviewerName: 'Bác sĩ A', publishedAt: '2026-10-27T07:00:00.000Z' }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_SCHEDULE_INVALID' });
    const draft = post({ title: 'Bản cũ', reviewerName: 'Bác sĩ A' });
    f.setRow({ id: ID, slug: 'ban-moi', status: 'PUBLISHED' });
    f.setVersion(draft);
    await f.service.restore(actor, 'posts', ID, VERSION);
    expect(f.saved[0]).toMatchObject({ action: 'CONTENT_RESTORE', input: { value: { slug: 'ban-cu' } } });
    expect(f.invalidated).toContain('/tin-tuc/ban-moi');
  });

  it('chặn thời gian banner ngược và quyền biên tập của tài khoản cơ sở', async () => {
    const f = fake();
    const banner: AdminContentInput = {
      kind: 'banners',
      value: {
        placement: 'HOME',
        imageUrl: '/uploads/2026/10/image.png',
        startAt: '2026-11-02T00:00:00.000Z',
        endAt: '2026-11-01T00:00:00.000Z',
        sortOrder: 0,
        active: true,
      },
    };
    await expect(f.service.save(actor, banner)).rejects.toMatchObject({ code: 'CONTENT_DATE_RANGE' });
    const localActor = { ...actor, facilityIds: [CATEGORY] };
    await expect(f.service.list(localActor, 'posts', 1, 20)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('chỉ nhận ảnh đúng chữ ký tệp', async () => {
    const f = fake();
    await expect(
      f.service.upload(actor, Buffer.from('<svg/>'), 'image/svg+xml', 'Ảnh'),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    await expect(f.service.upload(actor, png, 'image/png', 'Ảnh')).resolves.toMatchObject({
      url: '/uploads/2026/10/image.png',
    });
  });
});
