'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Plus, Trash2, Upload } from 'lucide-react';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContentBlocksSchema, type ContentBlock, type ContentBlocks } from '@/lib/domain/content/blocks';

const LABELS = {
  paragraph: 'Đoạn văn',
  heading: 'Tiêu đề',
  list: 'Danh sách',
  image: 'Ảnh',
  quote: 'Trích dẫn',
  table: 'Bảng',
  button: 'Nút liên kết',
  video: 'Video YouTube',
  callout: 'Ghi chú',
  faq: 'Hỏi đáp',
} as const;
type Kind = keyof typeof LABELS;
const fieldStyle =
  'border-input bg-card text-foreground focus-visible:border-primary min-h-24 w-full rounded-md border p-3';

function blank(kind: Kind): ContentBlock {
  switch (kind) {
    case 'paragraph':
      return { type: kind, content: [{ text: '' }] };
    case 'heading':
      return { type: kind, level: 2, text: '' };
    case 'list':
      return { type: kind, ordered: false, items: [[{ text: '' }]] };
    case 'image':
      return { type: kind, src: '/uploads/', alt: '', width: 1200, height: 800 };
    case 'quote':
      return { type: kind, content: [{ text: '' }] };
    case 'table':
      return { type: kind, headers: ['Cột 1'], rows: [['']] };
    case 'button':
      return { type: kind, label: '', href: '/' };
    case 'video':
      return { type: kind, youtubeId: '', title: '' };
    case 'callout':
      return { type: kind, tone: 'info', content: [{ text: '' }] };
    case 'faq':
      return { type: kind, items: [{ question: '', answer: [{ text: '' }] }] };
  }
}

export function BlockEditor({
  blocks,
  onChange,
  onUpload,
}: {
  blocks: ContentBlocks;
  onChange: (blocks: ContentBlocks) => void;
  onUpload: (file: File, alt: string) => Promise<string>;
}) {
  const [kind, setKind] = useState<Kind>('paragraph');
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const change = (index: number, block: ContentBlock) =>
    onChange(blocks.map((item, i) => (i === index ? block : item)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const copy = [...blocks];
    const selected = copy[from];
    const other = copy[to];
    if (!selected || !other) return;
    copy[from] = other;
    copy[to] = selected;
    onChange(copy);
  };
  const parsed = ContentBlocksSchema.safeParse(blocks);

  return (
    <section className="space-y-4" aria-label="Trình soạn thảo khối">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Loại khối mới"
          className="border-input bg-card h-11 rounded-md border px-3"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          {Object.entries(LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={() => onChange([...blocks, blank(kind)])}>
          <Plus aria-hidden /> Thêm khối
        </Button>
        <Button type="button" variant="ghost" onClick={() => setPreview((value) => !value)}>
          <Eye aria-hidden /> {preview ? 'Ẩn xem trước' : 'Xem trước'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      {preview && (
        <div className="border-hairline bg-paper rounded-xl border p-4" aria-label="Bản xem trước">
          {parsed.success ? (
            <BlockRenderer blocks={parsed.data} />
          ) : (
            <p className="text-warning">Điền đủ các trường của khối để xem trước.</p>
          )}
        </div>
      )}
      {blocks.map((block, index) => (
        <div key={index} className="border-hairline bg-paper rounded-xl border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <strong className="text-ink-navy">
              {index + 1}. {LABELS[block.type]}
            </strong>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Chuyển khối ${index + 1} lên`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Chuyển khối ${index + 1} xuống`}
                disabled={index === blocks.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown aria-hidden />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Xóa khối ${index + 1}`}
                onClick={() => onChange(blocks.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </div>
          {block.type === 'heading' && (
            <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
              <select
                aria-label="Cấp tiêu đề"
                className="border-input rounded-md border px-2"
                value={block.level}
                onChange={(e) => change(index, { ...block, level: Number(e.target.value) as 2 | 3 | 4 })}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    H{n}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Nội dung tiêu đề"
                value={block.text}
                onChange={(e) => change(index, { ...block, text: e.target.value })}
              />
            </div>
          )}
          {block.type === 'paragraph' && (
            <textarea
              aria-label="Nội dung đoạn văn"
              className={fieldStyle}
              value={block.content.map((part) => part.text).join('')}
              onChange={(e) => change(index, { type: 'paragraph', content: [{ text: e.target.value }] })}
            />
          )}
          {block.type === 'quote' && (
            <div className="space-y-2">
              <textarea
                aria-label="Trích dẫn"
                className={fieldStyle}
                value={block.content.map((part) => part.text).join('')}
                onChange={(e) => change(index, { ...block, content: [{ text: e.target.value }] })}
              />
              <Input
                aria-label="Nguồn trích dẫn"
                placeholder="Nguồn trích dẫn"
                value={block.attribution ?? ''}
                onChange={(e) => change(index, { ...block, attribution: e.target.value })}
              />
            </div>
          )}
          {block.type === 'list' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={block.ordered}
                  onChange={(e) => change(index, { ...block, ordered: e.target.checked })}
                />{' '}
                Danh sách có số
              </label>
              <textarea
                aria-label="Các mục, mỗi dòng một mục"
                className={fieldStyle}
                value={block.items.map((item) => item.map((part) => part.text).join('')).join('\n')}
                onChange={(e) =>
                  change(index, { ...block, items: e.target.value.split('\n').map((text) => [{ text }]) })
                }
              />
            </div>
          )}
          {block.type === 'image' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Đường dẫn ảnh"
                value={block.src}
                onChange={(e) => change(index, { ...block, src: e.target.value })}
              />
              <Input
                aria-label="Mô tả ảnh"
                placeholder="Mô tả ảnh"
                value={block.alt}
                onChange={(e) => change(index, { ...block, alt: e.target.value })}
              />
              <Input
                aria-label="Chú thích ảnh"
                placeholder="Chú thích ảnh"
                value={block.caption ?? ''}
                onChange={(e) => change(index, { ...block, caption: e.target.value })}
              />
              <label className="border-hairline inline-flex cursor-pointer items-center gap-2 rounded-md border px-3">
                <Upload size={18} aria-hidden /> {uploading === index ? 'Đang tải ảnh…' : 'Tải ảnh lên'}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(index);
                    setError('');
                    try {
                      const src = await onUpload(file, block.alt || file.name);
                      change(index, { ...block, src, alt: block.alt || file.name });
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : 'Không tải được ảnh');
                    } finally {
                      setUploading(null);
                    }
                  }}
                />
              </label>
            </div>
          )}
          {block.type === 'table' && (
            <div className="space-y-2">
              <Input
                aria-label="Tiêu đề cột, phân cách bằng dấu tab"
                value={block.headers.join('\t')}
                onChange={(e) => change(index, { ...block, headers: e.target.value.split('\t') })}
              />
              <textarea
                aria-label="Các hàng bảng, mỗi dòng một hàng và các cột phân cách bằng tab"
                className={fieldStyle}
                value={block.rows.map((row) => row.join('\t')).join('\n')}
                onChange={(e) =>
                  change(index, { ...block, rows: e.target.value.split('\n').map((row) => row.split('\t')) })
                }
              />
            </div>
          )}
          {block.type === 'button' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Nhãn nút"
                placeholder="Nhãn nút"
                value={block.label}
                onChange={(e) => change(index, { ...block, label: e.target.value })}
              />
              <Input
                aria-label="Đường dẫn nút"
                placeholder="/duong-dan"
                value={block.href}
                onChange={(e) => change(index, { ...block, href: e.target.value })}
              />
            </div>
          )}
          {block.type === 'video' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Mã video YouTube"
                placeholder="11 ký tự sau v="
                value={block.youtubeId}
                onChange={(e) => change(index, { ...block, youtubeId: e.target.value })}
              />
              <Input
                aria-label="Tiêu đề video"
                placeholder="Tiêu đề video"
                value={block.title}
                onChange={(e) => change(index, { ...block, title: e.target.value })}
              />
            </div>
          )}
          {block.type === 'callout' && (
            <div className="space-y-2">
              <select
                aria-label="Kiểu ghi chú"
                className="border-input h-11 rounded-md border px-3"
                value={block.tone}
                onChange={(e) =>
                  change(index, { ...block, tone: e.target.value as 'info' | 'warning' | 'success' })
                }
              >
                {['info', 'warning', 'success'].map((tone) => (
                  <option key={tone}>{tone}</option>
                ))}
              </select>
              <Input
                aria-label="Tiêu đề ghi chú"
                value={block.title ?? ''}
                onChange={(e) => change(index, { ...block, title: e.target.value })}
              />
              <textarea
                aria-label="Nội dung ghi chú"
                className={fieldStyle}
                value={block.content.map((part) => part.text).join('')}
                onChange={(e) => change(index, { ...block, content: [{ text: e.target.value }] })}
              />
            </div>
          )}
          {block.type === 'faq' && (
            <div className="space-y-2">
              <Input
                aria-label="Câu hỏi"
                value={block.items[0]?.question ?? ''}
                onChange={(e) =>
                  change(index, {
                    ...block,
                    items: [{ question: e.target.value, answer: block.items[0]?.answer ?? [{ text: '' }] }],
                  })
                }
              />
              <textarea
                aria-label="Trả lời"
                className={fieldStyle}
                value={block.items[0]?.answer.map((part) => part.text).join('') ?? ''}
                onChange={(e) =>
                  change(index, {
                    ...block,
                    items: [{ question: block.items[0]?.question ?? '', answer: [{ text: e.target.value }] }],
                  })
                }
              />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
