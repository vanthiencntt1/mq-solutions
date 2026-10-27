'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  Gauge,
  LockKeyhole,
  Mail,
  Palette,
  Save,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

type Field = {
  name: string;
  label: string;
  kind?: 'text' | 'email' | 'url' | 'number' | 'time' | 'color' | 'textarea' | 'boolean' | 'select';
  hint?: string;
  options?: { value: string; label: string }[];
};
type Group = { key: string; title: string; description: string; icon: LucideIcon; fields: Field[] };

// A11 mục 1: nhãn form đi theo đúng các khóa SystemSetting; bí mật không xuất hiện trong form.
const groups: Group[] = [
  {
    key: 'brand',
    title: 'Thương hiệu',
    description: 'Tên, hình ảnh và màu hành động chính.',
    icon: Palette,
    fields: [
      { name: 'name', label: 'Tên thương hiệu' },
      { name: 'logoLight', label: 'Logo nền sáng', hint: 'Đường dẫn /uploads/... của tệp đã tải lên.' },
      { name: 'logoDark', label: 'Logo nền tối', hint: 'Đường dẫn /uploads/... của tệp đã tải lên.' },
      { name: 'favicon', label: 'Favicon', hint: 'Đường dẫn /uploads/... của tệp đã tải lên.' },
      {
        name: 'primaryColor',
        label: 'Màu nút chính',
        kind: 'color',
        hint: 'Hệ thống tự làm đậm nếu chữ trắng chưa đạt tương phản AA.',
      },
    ],
  },
  {
    key: 'contact',
    title: 'Liên hệ',
    description: 'Thông tin hỗ trợ và kênh mạng xã hội.',
    icon: ContactRound,
    fields: [
      { name: 'hotline', label: 'Hotline' },
      { name: 'email', label: 'Email CSKH', kind: 'email' },
      { name: 'address', label: 'Địa chỉ công ty' },
      { name: 'taxCode', label: 'Mã số thuế' },
      { name: 'facebook', label: 'Facebook', kind: 'url' },
      { name: 'zalo', label: 'Zalo OA', kind: 'url' },
      { name: 'youtube', label: 'YouTube', kind: 'url' },
      { name: 'tiktok', label: 'TikTok', kind: 'url' },
    ],
  },
  {
    key: 'seo',
    title: 'SEO mặc định',
    description: 'Thông tin khi trang chưa có SEO riêng.',
    icon: Search,
    fields: [
      { name: 'title', label: 'Tiêu đề mặc định' },
      { name: 'description', label: 'Mô tả mặc định', kind: 'textarea' },
      { name: 'ogImage', label: 'Ảnh Open Graph', hint: 'Đường dẫn /uploads/...' },
      { name: 'ga4Id', label: 'Mã GA4', hint: 'Ví dụ G-ABC12345' },
      { name: 'searchConsoleCode', label: 'Mã xác minh Search Console' },
    ],
  },
  {
    key: 'auth',
    title: 'Tài khoản bệnh nhân',
    description: 'Chính sách mật khẩu và thời hạn phiên.',
    icon: ShieldCheck,
    fields: [
      {
        name: 'passwordMode',
        label: 'Cách cấp mật khẩu',
        kind: 'select',
        options: [
          { value: 'RANDOM_EMAIL', label: 'Ngẫu nhiên qua email' },
          { value: 'BIRTH_YEAR', label: 'Năm sinh' },
        ],
      },
      { name: 'minLength', label: 'Độ dài mật khẩu tối thiểu', kind: 'number' },
      { name: 'maxFailed', label: 'Số lần sai trước khi khóa', kind: 'number' },
      { name: 'lockMinutes', label: 'Thời gian khóa (phút)', kind: 'number' },
      { name: 'jwtHours', label: 'Hạn phiên JWT (giờ)', kind: 'number' },
    ],
  },
  {
    key: 'booking',
    title: 'Đặt khám chung',
    description: 'Giữ chỗ, nhắc lịch và thời gian cache HIS.',
    icon: CalendarDays,
    fields: [
      { name: 'holdMinutes', label: 'Giữ chỗ (phút)', kind: 'number' },
      { name: 'maxOpenPerFacility', label: 'Phiếu chưa khám tối đa mỗi cơ sở', kind: 'number' },
      { name: 'remindAt', label: 'Giờ nhắc lịch', kind: 'time' },
      { name: 'catalogCacheMinutes', label: 'Cache danh mục HIS (phút)', kind: 'number' },
      { name: 'scheduleCacheMinutes', label: 'Cache lịch khám (phút)', kind: 'number' },
      { name: 'identityCacheMinutes', label: 'Cache định danh (phút)', kind: 'number' },
    ],
  },
  {
    key: 'rateLimit',
    title: 'Giới hạn tần suất',
    description: 'Ngưỡng mặc định cho các thao tác công khai.',
    icon: Gauge,
    fields: [
      { name: 'readPerMinute', label: 'Lượt đọc mỗi phút', kind: 'number' },
      { name: 'bookingPerMinute', label: 'Lượt đặt khám mỗi phút', kind: 'number' },
      { name: 'contactPerHour', label: 'Lượt liên hệ mỗi giờ', kind: 'number' },
    ],
  },
  {
    key: 'email',
    title: 'Email',
    description: 'Tên và địa chỉ hiển thị khi gửi thư.',
    icon: Mail,
    fields: [
      { name: 'fromAddress', label: 'Email gửi', kind: 'email' },
      { name: 'fromName', label: 'Tên người gửi' },
      { name: 'alertEmail', label: 'Email nhận cảnh báo', kind: 'email' },
    ],
  },
  {
    key: 'maintenance',
    title: 'Bảo trì',
    description: 'Hiển thị thông báo khi hệ thống hoặc đặt khám tạm dừng.',
    icon: Wrench,
    fields: [
      { name: 'enabled', label: 'Bật chế độ bảo trì', kind: 'boolean' },
      { name: 'bookingOnly', label: 'Chỉ tạm dừng đặt khám', kind: 'boolean' },
      { name: 'message', label: 'Thông điệp hiển thị', kind: 'textarea' },
    ],
  },
  {
    key: 'legal',
    title: 'Pháp lý',
    description: 'Phiên bản điều khoản và chính sách đang có hiệu lực.',
    icon: Scale,
    fields: [
      { name: 'termsVersion', label: 'Phiên bản điều khoản' },
      { name: 'privacyVersion', label: 'Phiên bản chính sách bảo mật' },
    ],
  },
];

function GroupForm({ group, initial }: { group: Group; initial: Record<string, unknown> }) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const Icon = group.icon;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ value: Record<string, unknown>; changed: boolean }>(
        `/api/admin/settings/${group.key}`,
        { method: 'PATCH', body: draft },
      );
      setDraft(result.value);
      setNotice(result.changed ? 'Đã lưu và ghi nhật ký thay đổi.' : 'Cấu hình không thay đổi.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa thể lưu cấu hình, vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id={group.key} className="scroll-mt-6 p-4 md:p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="border-border flex items-start gap-3 border-b pb-4">
          <span className="bg-info-bg text-info rounded-md p-2">
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="text-slate-gray text-sm">{group.description}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {group.fields.map((field) => {
            const id = `${group.key}-${field.name}`;
            const current = draft[field.name];
            if (field.kind === 'boolean')
              return (
                <label
                  key={id}
                  htmlFor={id}
                  className="border-border bg-muted flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium"
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={current === true}
                    onChange={(event) => setDraft({ ...draft, [field.name]: event.target.checked })}
                    className="accent-primary size-5"
                  />
                  {field.label}
                </label>
              );
            return (
              <FormField key={id} id={id} label={field.label} hint={field.hint}>
                {field.kind === 'select' ? (
                  <select
                    id={id}
                    value={String(current ?? '')}
                    onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
                    className="border-input bg-card text-foreground h-11 w-full rounded-md border px-3"
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.kind === 'textarea' ? (
                  <textarea
                    id={id}
                    value={String(current ?? '')}
                    rows={3}
                    onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
                    className="border-input bg-card text-foreground w-full rounded-md border px-3 py-2"
                  />
                ) : (
                  <Input
                    id={id}
                    type={field.kind ?? 'text'}
                    value={String(current ?? '')}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        [field.name]:
                          field.kind === 'number' ? Number(event.target.value) : event.target.value,
                      })
                    }
                    step={field.kind === 'number' ? 1 : undefined}
                  />
                )}
              </FormField>
            );
          })}
        </div>
        {group.key === 'brand' && (
          <div className="border-border flex items-center gap-3 rounded-md border p-3 text-sm">
            <span className="text-slate-gray">Xem trước</span>
            <span
              className="rounded-md px-4 py-2 font-semibold text-white"
              style={{ backgroundColor: String(draft.primaryColor) }}
            >
              Đặt khám
            </span>
          </div>
        )}
        {error && (
          <Alert tone="danger">
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </span>
          </Alert>
        )}
        {notice && (
          <Alert tone="success">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} />
              {notice}
            </span>
          </Alert>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={pending}>
            <Save size={16} aria-hidden="true" />
            {pending ? 'Đang lưu…' : `Lưu ${group.title.toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsPanel({
  initial,
  secretStatus,
}: {
  initial: Record<string, unknown>;
  secretStatus: { smtpCredentialsConfigured: boolean };
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-info flex items-center gap-2 text-xs font-semibold uppercase">
          <Settings2 size={16} /> Quản trị hệ thống · A11
        </p>
        <h1 className="text-[28px] leading-tight font-bold">Cấu hình hệ thống</h1>
        <p className="text-slate-gray text-sm">
          Mỗi nhóm được lưu riêng. Thay đổi có hiệu lực trong tối đa 5 phút.
        </p>
      </header>
      <nav
        aria-label="Nhóm cấu hình"
        className="border-border bg-card flex flex-wrap gap-2 rounded-xl border p-3"
      >
        {groups.map(({ key, title }) => (
          <a
            key={key}
            href={`#${key}`}
            className="text-ink-navy hover:bg-muted rounded-md px-3 py-2 text-sm font-medium"
          >
            {title}
          </a>
        ))}
      </nav>
      <Alert tone="info">
        <span className="inline-flex items-center gap-2">
          <LockKeyhole size={16} /> Bí mật SMTP:{' '}
          {secretStatus.smtpCredentialsConfigured ? 'Đã cấu hình' : 'Chưa cấu hình'} trong môi trường máy chủ.
          Mật khẩu và khóa API không được nhập tại đây.
        </span>
      </Alert>
      <div className="grid gap-6">
        {groups.map((group) => (
          <GroupForm key={group.key} group={group} initial={initial[group.key] as Record<string, unknown>} />
        ))}
      </div>
    </div>
  );
}
