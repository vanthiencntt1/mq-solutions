'use client';

import { useState, type FormEvent } from 'react';
import { ImageUp, RotateCcw, Save } from 'lucide-react';
import { BlockEditor } from './block-editor';
import { Alert, FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/components/common/api-client';
import { AdminContentInputSchemas, type AdminContentKind } from '@/lib/domain/content/admin-schemas';
import { ContentBlocksSchema, type ContentBlocks } from '@/lib/domain/content/blocks';
import { formatDateTime } from '@/lib/utils/format';

type Row = Record<string, unknown> & { id: string };
type Category = { id: string; name: string };
type Version = { id: string; createdAt: string; createdBy: string };
type Field = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'number' | 'checkbox' | 'csv' | 'image';
  options?: string[];
  required?: boolean;
};

const fields: Record<AdminContentKind, Field[]> = {
  posts: [
    { key: 'title', label: 'Tiêu đề', required: true },
    { key: 'slug', label: 'Đường dẫn (để trống để tự tạo)' },
    { key: 'categoryId', label: 'Chuyên mục', required: true },
    { key: 'excerpt', label: 'Tóm tắt', type: 'textarea' },
    { key: 'coverUrl', label: 'Ảnh bìa', type: 'image' },
    { key: 'tags', label: 'Thẻ, cách nhau bằng dấu phẩy', type: 'csv' },
    { key: 'specialtyTags', label: 'Thẻ chuyên khoa', type: 'csv' },
    { key: 'facilityIds', label: 'ID cơ sở liên quan', type: 'csv' },
    { key: 'authorName', label: 'Tác giả' },
    { key: 'reviewerName', label: 'Người duyệt chuyên môn' },
    { key: 'seoTitle', label: 'Tiêu đề SEO (tối đa 70 ký tự)' },
    { key: 'seoDesc', label: 'Mô tả SEO (tối đa 160 ký tự)', type: 'textarea' },
    { key: 'status', label: 'Trạng thái', options: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] },
    { key: 'publishedAt', label: 'Ngày giờ đăng (hẹn giờ)', type: 'date' },
  ],
  categories: [
    { key: 'name', label: 'Tên chuyên mục', required: true },
    { key: 'slug', label: 'Đường dẫn (để trống để tự tạo)' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
  pages: [
    { key: 'title', label: 'Tiêu đề', required: true },
    { key: 'slug', label: 'Đường dẫn', required: true },
    { key: 'version', label: 'Phiên bản', required: true },
    { key: 'effectiveAt', label: 'Ngày hiệu lực', type: 'date', required: true },
    { key: 'requireReconsent', label: 'Yêu cầu đồng ý lại', type: 'checkbox' },
    { key: 'status', label: 'Trạng thái', options: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
  ],
  faqs: [
    { key: 'groupName', label: 'Nhóm câu hỏi', required: true },
    { key: 'question', label: 'Câu hỏi', required: true },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  banners: [
    { key: 'placement', label: 'Vị trí', required: true },
    { key: 'imageUrl', label: 'Ảnh desktop', type: 'image', required: true },
    { key: 'imageMobileUrl', label: 'Ảnh mobile', type: 'image' },
    { key: 'title', label: 'Tiêu đề' },
    { key: 'link', label: 'Liên kết' },
    { key: 'startAt', label: 'Bắt đầu', type: 'date' },
    { key: 'endAt', label: 'Kết thúc', type: 'date' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  popups: [
    { key: 'imageUrl', label: 'Ảnh popup', type: 'image', required: true },
    { key: 'link', label: 'Liên kết' },
    { key: 'pages', label: 'Trang áp dụng, cách nhau bằng dấu phẩy', type: 'csv', required: true },
    { key: 'frequency', label: 'Tần suất', options: ['ONCE_SESSION', 'ONCE_DAY'] },
    { key: 'startAt', label: 'Bắt đầu', type: 'date' },
    { key: 'endAt', label: 'Kết thúc', type: 'date' },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  menus: [
    { key: 'location', label: 'Vị trí', options: ['HEADER', 'FOOTER_COL_1', 'FOOTER_COL_2', 'FOOTER_COL_3'] },
    { key: 'parentId', label: 'ID menu cha (tối đa 2 cấp)' },
    { key: 'label', label: 'Nhãn', required: true },
    { key: 'href', label: 'Đường dẫn nội bộ', required: true },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  'home-blocks': [
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'active', label: 'Đang hiển thị', type: 'checkbox' },
    { key: 'status', label: 'Trạng thái', options: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
  ],
};

function initial(kind: AdminContentKind, row: Row | null, categories: Category[]): Record<string, unknown> {
  const source: Record<string, unknown> = row ?? {};
  return {
    ...source,
    slug: source.slug ?? '',
    status: source.status ?? 'DRAFT',
    categoryId: source.categoryId ?? categories[0]?.id ?? '',
    version: source.version ?? '1.0',
    effectiveAt: source.effectiveAt ?? new Date().toISOString(),
    sortOrder: source.sortOrder ?? 0,
    active: source.active ?? true,
    tags: source.tags ?? [],
    facilityIds: source.facilityIds ?? [],
    specialtyTags: source.specialtyTags ?? [],
    pages: source.pages ?? ['/'],
    frequency: source.frequency ?? 'ONCE_SESSION',
    location: source.location ?? 'HEADER',
    page: kind === 'home-blocks' ? 'HOME' : source.page,
    type: kind === 'home-blocks' ? 'CONTENT' : source.type,
  };
}

function blocksFor(kind: AdminContentKind, row: Row | null): ContentBlocks {
  const source = kind === 'faqs' ? row?.answer : kind === 'home-blocks' ? row?.data : row?.contentJson;
  const parsed = ContentBlocksSchema.safeParse(source);
  return parsed.success ? parsed.data : [];
}

async function uploadImage(file: File, alt: string): Promise<string> {
  const body = new FormData();
  body.set('file', file);
  body.set('alt', alt || file.name);
  const response = await fetch('/api/admin/content/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  });
  const parsed = (await response.json()) as { data?: { url: string }; error?: { message: string } };
  if (!response.ok || !parsed.data) throw new Error(parsed.error?.message ?? 'Không tải được ảnh');
  return parsed.data.url;
}

export function ContentForm({
  kind,
  row,
  categories,
  onSaved,
  onCancel,
}: {
  kind: AdminContentKind;
  row: Row | null;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => initial(kind, row, categories));
  const [blocks, setBlocks] = useState<ContentBlocks>(() => blocksFor(kind, row));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState<Version[] | null>(null);
  const set = (key: string, value: unknown) => setValues((old) => ({ ...old, [key]: value }));
  const hasBlocks = ['posts', 'pages', 'faqs', 'home-blocks'].includes(kind);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = Object.fromEntries(
      fields[kind].map(({ key, type }) => [
        key,
        type === 'date' ? (values[key] ? new Date(String(values[key])).toISOString() : null) : values[key],
      ]),
    );
    if (kind === 'posts' || kind === 'pages' || kind === 'home-blocks') payload.blocks = blocks;
    if (kind === 'faqs') payload.answer = blocks;
    if (kind === 'home-blocks') {
      payload.page = 'HOME';
      payload.type = 'CONTENT';
    }
    const parsed = AdminContentInputSchemas[kind].safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · '));
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/admin/content/${kind}${row ? `/${row.id}` : ''}`, {
        method: row ? 'PATCH' : 'POST',
        body: parsed.data,
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được nội dung');
    } finally {
      setBusy(false);
    }
  }

  async function loadVersions() {
    if (!row) return;
    try {
      setVersions(await apiFetch<Version[]>(`/api/admin/content/${kind}/${row.id}/versions`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử');
    }
  }
  async function restore(versionId: string) {
    if (!row || !confirm('Khôi phục phiên bản này? Nội dung hiện tại vẫn được lưu trong lịch sử.')) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/content/${kind}/${row.id}/restore`, { method: 'POST', body: { versionId } });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không khôi phục được');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-ink-navy text-xl font-semibold">
          {row ? 'Chỉnh sửa nội dung' : 'Tạo nội dung mới'}
        </h2>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Đóng
        </Button>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        {fields[kind].map((field) => (
          <FormField
            key={field.key}
            id={`cms-${field.key}`}
            label={field.label}
            className={field.type === 'textarea' ? 'md:col-span-2' : ''}
          >
            {field.key === 'categoryId' ? (
              <select
                id={`cms-${field.key}`}
                className="border-input bg-card h-11 w-full rounded-md border px-3"
                value={String(values[field.key] ?? '')}
                onChange={(e) => set(field.key, e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : field.options ? (
              <select
                id={`cms-${field.key}`}
                className="border-input bg-card h-11 w-full rounded-md border px-3"
                value={String(values[field.key] ?? field.options[0])}
                onChange={(e) => set(field.key, e.target.value)}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                id={`cms-${field.key}`}
                type="checkbox"
                className="size-5"
                checked={Boolean(values[field.key])}
                onChange={(e) => set(field.key, e.target.checked)}
              />
            ) : field.type === 'textarea' ? (
              <textarea
                id={`cms-${field.key}`}
                className="border-input bg-card min-h-24 w-full rounded-md border p-3"
                value={String(values[field.key] ?? '')}
                onChange={(e) => set(field.key, e.target.value)}
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  id={`cms-${field.key}`}
                  required={field.required}
                  type={
                    field.type === 'date' ? 'datetime-local' : field.type === 'number' ? 'number' : 'text'
                  }
                  value={
                    field.type === 'csv'
                      ? Array.isArray(values[field.key])
                        ? (values[field.key] as string[]).join(', ')
                        : String(values[field.key] ?? '')
                      : field.type === 'date'
                        ? String(values[field.key] ?? '').slice(0, 16)
                        : String(values[field.key] ?? '')
                  }
                  onChange={(e) =>
                    set(
                      field.key,
                      field.type === 'csv'
                        ? e.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean)
                        : field.type === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    )
                  }
                />
                {field.type === 'image' && (
                  <label className="border-hairline inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-3">
                    <ImageUp size={18} aria-hidden />
                    <span className="sr-only">Tải {field.label.toLowerCase()}</span>
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          set(field.key, await uploadImage(file, file.name));
                        } catch (cause) {
                          setError(cause instanceof Error ? cause.message : 'Không tải được ảnh');
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </FormField>
        ))}
      </div>
      {hasBlocks && (
        <div className="border-hairline border-t pt-5">
          <h3 className="text-ink-navy mb-3 text-lg font-semibold">Nội dung theo khối</h3>
          <BlockEditor blocks={blocks} onChange={setBlocks} onUpload={uploadImage} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          <Save aria-hidden /> {busy ? 'Đang lưu…' : 'Lưu nội dung'}
        </Button>
        {row && (
          <Button type="button" variant="outline" onClick={() => void loadVersions()}>
            <RotateCcw aria-hidden /> Lịch sử phiên bản
          </Button>
        )}
      </div>
      {versions && (
        <section aria-label="Lịch sử phiên bản" className="border-hairline rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Lịch sử ({versions.length})</h3>
          {versions.length === 0 ? (
            <p className="text-slate-gray">Chưa có phiên bản.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="border-hairline flex flex-wrap items-center justify-between gap-2 border-t pt-2"
                >
                  <span>{formatDateTime(version.createdAt)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void restore(version.id)}
                  >
                    Khôi phục
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </form>
  );
}
