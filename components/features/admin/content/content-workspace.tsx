'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  Pencil,
  CircleCheck,
  Clock3,
  EyeOff,
  BookOpen,
} from 'lucide-react';
import { z } from 'zod';
import { apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { AdminContentKindSchema, type AdminContentKind } from '@/lib/domain/content/admin-schemas';
import { formatDateTime } from '@/lib/utils/format';
import { ContentForm } from './content-form';

const TABS: { kind: AdminContentKind; label: string }[] = [
  { kind: 'posts', label: 'Tin tức' },
  { kind: 'categories', label: 'Chuyên mục' },
  { kind: 'pages', label: 'Trang & chính sách' },
  { kind: 'faqs', label: 'FAQ' },
  { kind: 'banners', label: 'Banner' },
  { kind: 'popups', label: 'Popup' },
  { kind: 'menus', label: 'Menu' },
  { kind: 'home-blocks', label: 'Trang chủ' },
];
const RowSchema = z.object({ id: z.uuid() }).passthrough();
type Row = z.infer<typeof RowSchema>;
type Category = { id: string; name: string };

function title(row: Row, kind: AdminContentKind): string {
  const key =
    kind === 'faqs'
      ? 'question'
      : kind === 'menus'
        ? 'label'
        : kind === 'categories'
          ? 'name'
          : kind === 'home-blocks'
            ? 'type'
            : 'title';
  return typeof row[key] === 'string'
    ? row[key]
    : kind === 'banners' || kind === 'popups'
      ? 'Hình ảnh'
      : 'Chưa đặt tên';
}

function Status({ row }: { row: Row }) {
  const status = row.status;
  if (status === 'PUBLISHED')
    return (
      <span className="text-success inline-flex items-center gap-1">
        <CircleCheck size={16} aria-hidden /> Đã xuất bản
      </span>
    );
  if (status === 'SCHEDULED')
    return (
      <span className="text-warning inline-flex items-center gap-1">
        <Clock3 size={16} aria-hidden /> Đã hẹn giờ
      </span>
    );
  if (status === 'ARCHIVED' || row.active === false)
    return (
      <span className="text-slate-gray inline-flex items-center gap-1">
        <EyeOff size={16} aria-hidden /> Đang ẩn
      </span>
    );
  return (
    <span className="text-slate-gray inline-flex items-center gap-1">
      <FileText size={16} aria-hidden /> Bản nháp
    </span>
  );
}

export function ContentWorkspace({ canWrite }: { canWrite: boolean }) {
  const [kind, setKind] = useState<AdminContentKind>('posts');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Row | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [nonce, setNonce] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [items, cats] = await Promise.all([
        apiFetch<unknown>(`/api/admin/content/${kind}?page=${page}&pageSize=20`),
        apiFetch<unknown>('/api/admin/content/categories?pageSize=100'),
      ]);
      setRows(z.array(RowSchema).parse(items));
      setCategories(z.array(z.object({ id: z.uuid(), name: z.string() })).parse(cats));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được nội dung');
    } finally {
      setLoading(false);
    }
  }, [kind, page]);
  useEffect(() => {
    void load();
  }, [load, nonce]);

  async function remove(row: Row) {
    if (!confirm(`Xóa “${title(row, kind)}”? Thao tác này sẽ ghi nhật ký.`)) return;
    try {
      await apiFetch(`/api/admin/content/${kind}/${row.id}`, { method: 'DELETE' });
      setNotice('Đã xóa nội dung.');
      setNonce((n) => n + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không xóa được nội dung');
    }
  }
  function tab(next: string) {
    const parsed = AdminContentKindSchema.safeParse(next);
    if (!parsed.success) return;
    setKind(parsed.data);
    setPage(1);
    setSelected(undefined);
    setNotice('');
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-deep-cobalt flex items-center gap-2 text-sm font-semibold">
            <BookOpen size={18} aria-hidden /> A04 · BIÊN TẬP
          </p>
          <h1 className="text-ink-navy mt-1 text-[28px] font-bold">Quản lý nội dung</h1>
          <p className="text-slate-gray text-sm">Soạn khối, kiểm tra bản nháp, đặt lịch và xuất bản.</p>
        </div>
        {canWrite && (
          <Button onClick={() => setSelected(null)}>
            <Plus aria-hidden /> Tạo {TABS.find((item) => item.kind === kind)?.label.toLowerCase()}
          </Button>
        )}
      </header>
      <nav aria-label="Loại nội dung" className="border-hairline flex gap-1 overflow-x-auto border-b pb-2">
        {TABS.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => tab(item.kind)}
            aria-current={kind === item.kind ? 'page' : undefined}
            className={`min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold ${kind === item.kind ? 'bg-info-bg text-deep-cobalt' : 'text-slate-gray hover:bg-pebble'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {error && <Alert tone="danger">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {selected !== undefined && (
        <Card className="p-4 md:p-6">
          <ContentForm
            key={`${kind}:${selected?.id ?? 'new'}`}
            kind={kind}
            row={selected}
            categories={categories}
            onCancel={() => setSelected(undefined)}
            onSaved={() => {
              setSelected(undefined);
              setNotice('Đã lưu nội dung và cập nhật lịch sử.');
              setNonce((n) => n + 1);
            }}
          />
        </Card>
      )}
      <Card className="p-0">
        <div className="border-hairline flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-ink-navy font-semibold">{TABS.find((item) => item.kind === kind)?.label}</h2>
          <Badge>{rows.length} mục trên trang</Badge>
        </div>
        {loading ? (
          <p role="status" className="text-slate-gray p-6">
            Đang tải nội dung…
          </p>
        ) : rows.length === 0 ? (
          <div className="text-slate-gray p-8 text-center">
            <ImageIcon className="mx-auto mb-2" aria-hidden />
            <p>Chưa có nội dung trong mục này.</p>
          </div>
        ) : (
          <ul className="divide-hairline divide-y">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-ink-navy truncate font-semibold">{title(row, kind)}</p>
                  <div className="text-slate-gray mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <Status row={row} />
                    {typeof row.slug === 'string' && <span>/{row.slug}</span>}
                    {typeof row.updatedAt === 'string' && <span>{formatDateTime(row.updatedAt)}</span>}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Sửa ${title(row, kind)}`}
                      onClick={() => setSelected(row)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Xóa ${title(row, kind)}`}
                      onClick={() => void remove(row)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-gray">Trang {page}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((n) => n - 1)}
          >
            Trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < 20 || loading}
            onClick={() => setPage((n) => n + 1)}
          >
            Tiếp
          </Button>
        </div>
      </div>
    </div>
  );
}
