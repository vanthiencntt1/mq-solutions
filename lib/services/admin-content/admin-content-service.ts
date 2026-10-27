import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ContentBlocksSchema } from '@/lib/domain/content/blocks';
import {
  parseAdminContentInput,
  publicPaths,
  sanitizeBlocks,
  slugify,
  type AdminContentInput,
  type AdminContentKind,
} from '@/lib/domain/content/admin-schemas';
import type { AdminContentRepository, AdminContentStorage } from '@/lib/domain/content/admin-ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { uploadUrl } from '@/lib/services/upload-service';

type Deps = {
  repo: AdminContentRepository;
  storage: AdminContentStorage;
  revalidate: (path: string) => void;
  now: () => Date;
};

const IdentitySchema = z.object({ slug: z.string().optional() }).passthrough();
type PostValue = Extract<AdminContentInput, { kind: 'posts' }>['value'];

export class AdminContentService {
  constructor(private readonly d: Deps) {}

  private authorize(actor: AdminPrincipal, write: boolean): void {
    const permission = write ? PERMISSIONS.CONTENT_WRITE : PERMISSIONS.CONTENT_READ;
    if (!can({ name: actor.role, permissions: actor.permissions }, permission) || actor.facilityIds !== null)
      throw new AppError('FORBIDDEN');
  }

  async list(actor: AdminPrincipal, kind: AdminContentKind, page: number, pageSize: number) {
    this.authorize(actor, false);
    return this.d.repo.list(kind, (page - 1) * pageSize, pageSize);
  }

  async get(actor: AdminPrincipal, kind: AdminContentKind, id: string) {
    this.authorize(actor, false);
    const row = await this.d.repo.find(kind, id);
    if (!row) throw new AppError('NOT_FOUND');
    return row;
  }

  async save(actor: AdminPrincipal, input: AdminContentInput, id?: string, action?: string) {
    this.authorize(actor, true);
    const kind = input.kind;
    const previous = id ? await this.d.repo.find(kind, id) : null;
    if (id && !previous) throw new AppError('NOT_FOUND');
    let normalized: AdminContentInput = input;
    if (input.kind === 'posts') {
      const slug = await this.uniqueSlug('posts', input.value.slug, input.value.title, id);
      const value = await this.checkPost({ ...input.value, slug, blocks: sanitizeBlocks(input.value.blocks) });
      normalized = { kind: 'posts', value };
    } else if (input.kind === 'categories') {
      const slug = await this.uniqueSlug('categories', input.value.slug, input.value.name, id);
      normalized = { kind: 'categories', value: { ...input.value, slug } };
    } else if (input.kind === 'pages') {
      const slug = await this.uniqueSlug('pages', input.value.slug, input.value.title, id);
      const blocks = sanitizeBlocks(input.value.blocks);
      if (input.value.status === 'PUBLISHED' && blocks.length === 0) throw new AppError('CONTENT_EMPTY');
      normalized = { kind: 'pages', value: { ...input.value, slug, blocks } };
    } else if (input.kind === 'faqs') {
      normalized = { kind: 'faqs', value: { ...input.value, answer: sanitizeBlocks(input.value.answer) } };
    } else if (input.kind === 'home-blocks') {
      normalized = { kind: 'home-blocks', value: { ...input.value, blocks: sanitizeBlocks(input.value.blocks) } };
    } else if (input.kind === 'banners' || input.kind === 'popups') {
      if (input.value.startAt && input.value.endAt && input.value.startAt >= input.value.endAt)
        throw new AppError('CONTENT_DATE_RANGE');
    } else if (input.kind === 'menus' && id && input.value.parentId === id) {
      throw new AppError('CONTENT_MENU_CYCLE');
    }

    const saved = await this.d.repo.save(normalized, id, actor.id, action);
    const before = previous ? IdentitySchema.parse(previous) : null;
    for (const path of new Set([...publicPaths(kind, before?.slug), ...publicPaths(kind, saved.slug)]))
      this.d.revalidate(path);
    return this.get(actor, kind, saved.id);
  }

  private async uniqueSlug(kind: 'posts' | 'categories' | 'pages', supplied: string | undefined, name: string, id?: string): Promise<string> {
    const slug = slugify(supplied || name);
    if (!slug) throw new AppError('VALIDATION_FAILED', 'Không tạo được đường dẫn từ tiêu đề');
    if (await this.d.repo.slugExists(kind, slug, id)) throw new AppError('CONTENT_SLUG_EXISTS');
    return slug;
  }

  private async checkPost(value: PostValue): Promise<PostValue> {
    const category = await this.d.repo.category(value.categoryId);
    if (!category) throw new AppError('NOT_FOUND', 'Chuyên mục không tồn tại');
    const publishing = value.status === 'PUBLISHED' || value.status === 'SCHEDULED';
    if (publishing && !ContentBlocksSchema.parse(value.blocks).length) throw new AppError('CONTENT_EMPTY');
    // A04 mục 2: bài y khoa phải có người duyệt trước khi lên lịch hoặc xuất bản.
    if (
      publishing &&
      (['tin-y-te', 'y-hoc-thuong-thuc'].includes(category.slug) || value.specialtyTags.length > 0) &&
      !value.reviewerName?.trim()
    )
      throw new AppError('CONTENT_REVIEWER_REQUIRED');
    if (value.status === 'SCHEDULED' && (!value.publishedAt || new Date(value.publishedAt) <= this.d.now()))
      throw new AppError('CONTENT_SCHEDULE_INVALID');
    if (value.status === 'PUBLISHED' && value.publishedAt && new Date(value.publishedAt) > this.d.now())
      throw new AppError('CONTENT_SCHEDULE_INVALID');
    return value.status === 'PUBLISHED' && !value.publishedAt
      ? { ...value, publishedAt: this.d.now().toISOString() }
      : value;
  }

  async remove(actor: AdminPrincipal, kind: AdminContentKind, id: string): Promise<void> {
    this.authorize(actor, true);
    const previous = await this.d.repo.find(kind, id);
    if (!previous) throw new AppError('NOT_FOUND');
    await this.d.repo.remove(kind, id, actor.id);
    for (const path of publicPaths(kind, IdentitySchema.parse(previous).slug)) this.d.revalidate(path);
  }

  async versions(actor: AdminPrincipal, kind: AdminContentKind, id: string) {
    this.authorize(actor, false);
    if (!(await this.d.repo.find(kind, id))) throw new AppError('NOT_FOUND');
    return this.d.repo.versions(kind, id);
  }

  async restore(actor: AdminPrincipal, kind: AdminContentKind, id: string, versionId: string) {
    this.authorize(actor, true);
    const raw = await this.d.repo.version(kind, id, versionId);
    if (!raw || typeof raw !== 'object' || !('kind' in raw) || !('value' in raw) || raw.kind !== kind)
      throw new AppError('NOT_FOUND');
    return this.save(actor, parseAdminContentInput(kind, raw.value), id, 'CONTENT_RESTORE');
  }

  async upload(actor: AdminPrincipal, data: Buffer, mime: string, alt: string) {
    this.authorize(actor, true);
    if (data.length === 0 || data.length > 10 * 1024 * 1024)
      throw new AppError('VALIDATION_FAILED', 'Ảnh phải nhỏ hơn 10 MB');
    const valid =
      mime === 'image/png'
        ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === 'image/jpeg'
          ? data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : mime === 'image/webp' &&
            data.toString('ascii', 0, 4) === 'RIFF' &&
            data.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new AppError('VALIDATION_FAILED', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP hợp lệ');
    const file = await this.d.storage.save({ data, mime, visibility: 'public' });
    return this.d.repo.mediaCreate({ ...file, url: uploadUrl(file.key), alt: alt.trim().slice(0, 300), createdBy: actor.id });
  }

  async media(actor: AdminPrincipal, page: number, pageSize: number) {
    this.authorize(actor, false);
    return this.d.repo.mediaList((page - 1) * pageSize, pageSize);
  }
}
