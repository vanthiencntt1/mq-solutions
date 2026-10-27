'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCircle2, Eye, Mail, Send, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils/format';
import type { EmailTemplateRow, TemplateCode } from '@/lib/domain/ports';

interface TemplateView extends EmailTemplateRow {
  label: string;
  variables: readonly string[];
}
interface LogView {
  id: string;
  template: string;
  recipient: string;
  status: string;
  createdAt: Date;
}
interface Props {
  templates: TemplateView[];
  logs: LogView[];
  total: number;
  today: number;
  page: number;
  pageSize: number;
  facilities: { id: string; name: string }[];
  canEditTemplate: boolean;
  canBroadcast: boolean;
  scoped: boolean;
}

const fieldClass = 'border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm';
const areaClass = 'border-input bg-card text-foreground min-h-40 w-full rounded-md border px-3 py-2 text-sm';

export function NotificationPanel({
  templates,
  logs,
  total,
  today,
  page,
  pageSize,
  facilities,
  canEditTemplate,
  canBroadcast,
  scoped,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(templates[0]?.code ?? 'ACCOUNT_CREATED');
  const initial = templates.find((item) => item.code === selected) ?? templates[0];
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [body, setBody] = useState(initial?.bodyJson.text ?? '');
  const [testTo, setTestTo] = useState('');
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
  const [facilityId, setFacilityId] = useState(scoped ? (facilities[0]?.id ?? '') : '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const template = templates.find((item) => item.code === selected) ?? templates[0];

  function choose(code: TemplateCode) {
    const next = templates.find((item) => item.code === code);
    if (!next) return;
    setSelected(code);
    setSubject(next.subject);
    setBody(next.bodyJson.text);
    setPreview(null);
    setError('');
    setNotice('');
  }

  async function execute<T>(action: () => Promise<T>, success: string | ((result: T) => string)) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(typeof success === 'string' ? success : success(result));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa thực hiện được thao tác');
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await execute(
      () =>
        apiFetch(`/api/admin/notifications/templates/${selected}`, {
          method: 'PATCH',
          body: { subject, bodyJson: { text: body } },
        }),
      'Đã lưu mẫu email. Những email gửi sau sẽ dùng nội dung mới.',
    );
  }

  async function showPreview() {
    await execute(async () => {
      const result = await apiFetch<{ subject: string; text: string }>('/api/admin/notifications/preview', {
        method: 'POST',
        body: { code: selected, subject, bodyJson: { text: body } },
      });
      setPreview(result);
    }, 'Đã tạo bản xem trước bằng dữ liệu mẫu.');
  }

  async function sendTest() {
    await execute(
      () =>
        apiFetch('/api/admin/notifications/test-email', {
          method: 'POST',
          body: { code: selected, to: testTo },
        }),
      'Đã đưa email thử vào hàng đợi. Email thử dùng mẫu đã lưu.',
    );
  }

  async function broadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await execute(async () => {
      const result = await apiFetch<{ count: number }>('/api/admin/notifications/broadcast', {
        method: 'POST',
        body: { title, body: message, link: link || null, facilityId: facilityId || null },
      });
      setTitle('');
      setMessage('');
      setLink('');
      return result;
    }, (result) => `Đã tạo ${result.count} thông báo.`);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-primary flex items-center gap-2 text-sm font-semibold">
          <Bell size={18} /> A08 · THÔNG BÁO
        </p>
        <h1 className="mt-1 text-[28px] font-bold">Thông báo & email</h1>
        <p className="text-slate-gray text-sm">
          Quản lý nội dung gửi đến bệnh nhân và theo dõi trạng thái gửi.
        </p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? (
        <Alert tone="success">
          <CheckCircle2 size={16} className="mr-2 inline" />
          {notice}
        </Alert>
      ) : null}
      {today >= 1600 ? (
        <Alert tone="warning">
          Đã gửi {today} email hôm nay, đạt ít nhất 80% hạn mức tham chiếu 2.000 email/ngày của Gmail
          Workspace.
        </Alert>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Mẫu email</h2>
          </div>
          <FormField id="template-code" label="Chọn mẫu">
            <select
              id="template-code"
              className={fieldClass}
              value={selected}
              onChange={(event) => choose(event.target.value as TemplateCode)}
            >
              {templates.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} · {item.code}
                </option>
              ))}
            </select>
          </FormField>
          <p className="text-slate-gray text-xs">
            Biến được phép: {template?.variables.map((variable) => `{{${variable}}}`).join(', ')}
          </p>
          <form onSubmit={save} className="space-y-4">
            <FormField id="email-subject" label="Tiêu đề">
              <Input
                id="email-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
                required
                disabled={!canEditTemplate}
              />
            </FormField>
            <FormField
              id="email-body"
              label="Nội dung"
              hint="Dùng văn bản thuần. Xuống dòng được giữ trong email."
            >
              <textarea
                id="email-body"
                className={areaClass}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10000}
                required
                disabled={!canEditTemplate}
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={() => void showPreview()}>
                <Eye size={16} />
                Xem trước
              </Button>
              {canEditTemplate ? (
                <Button type="submit" disabled={pending}>
                  Lưu mẫu
                </Button>
              ) : null}
            </div>
          </form>
          {preview ? (
            <div className="bg-pebble rounded-lg p-4">
              <p className="text-slate-gray mb-1 text-xs font-semibold">BẢN XEM TRƯỚC · DỮ LIỆU MẪU</p>
              <p className="font-semibold">{preview.subject}</p>
              <p className="mt-3 text-sm whitespace-pre-line">{preview.text}</p>
            </div>
          ) : null}
          {canEditTemplate ? (
            <div className="border-border space-y-3 border-t pt-4">
              <h3 className="font-semibold">Gửi thử mẫu đã lưu</h3>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="email"
                  aria-label="Địa chỉ nhận email thử"
                  placeholder="email@vidu.vn"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                  className="max-w-72"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !testTo}
                  onClick={() => void sendTest()}
                >
                  <Send size={16} />
                  Gửi thử
                </Button>
              </div>
              <p className="text-slate-gray text-xs">
                Email thử chỉ chứa giá trị mẫu, không chứa mật khẩu thật.
              </p>
            </div>
          ) : null}
        </Card>
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Thông báo hệ thống</h2>
          </div>
          <p className="text-slate-gray text-sm">
            Gửi tới mọi bệnh nhân hoặc người từng đặt khám tại một cơ sở.
          </p>
          {canBroadcast ? (
            <form onSubmit={broadcast} className="space-y-4">
              <FormField id="broadcast-facility" label="Đối tượng">
                <select
                  id="broadcast-facility"
                  className={fieldClass}
                  value={facilityId}
                  onChange={(event) => setFacilityId(event.target.value)}
                >
                  {!scoped ? <option value="">Tất cả bệnh nhân</option> : null}
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      Đã đặt khám tại {facility.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="broadcast-title" label="Tiêu đề">
                <Input
                  id="broadcast-title"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </FormField>
              <FormField id="broadcast-body" label="Nội dung">
                <textarea
                  id="broadcast-body"
                  className={areaClass}
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </FormField>
              <FormField id="broadcast-link" label="Liên kết nội bộ" hint="Ví dụ: /tai-khoan/phieu-kham">
                <Input
                  id="broadcast-link"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  maxLength={300}
                  placeholder="/tai-khoan"
                />
              </FormField>
              <Button type="submit" disabled={pending || (scoped && !facilityId)}>
                <Send size={16} />
                Gửi thông báo
              </Button>
            </form>
          ) : (
            <p className="text-slate-gray text-sm">Bạn có quyền xem, chưa có quyền gửi thông báo.</p>
          )}
        </Card>
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Lịch sử gửi email</h2>
            <p className="text-slate-gray text-xs">
              Địa chỉ được ẩn danh bằng mã băm; không lưu nội dung email.
            </p>
          </div>
          <span className="bg-info-bg text-info rounded-full px-3 py-1 text-xs font-semibold">
            Đã gửi hôm nay: {today}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="text-slate-gray border-border border-b">
              <tr>
                <th className="py-2">Thời gian</th>
                <th>Mẫu</th>
                <th>Người nhận</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-border border-b last:border-0">
                  <td className="py-3">{formatDateTime(log.createdAt)}</td>
                  <td>{log.template}</td>
                  <td>{log.recipient}</td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${log.status === 'SENT' ? 'text-success' : log.status === 'FAILED' ? 'text-danger' : 'text-info'}`}
                    >
                      <span aria-hidden>
                        {log.status === 'SENT' ? '✓' : log.status === 'FAILED' ? '!' : '•'}
                      </span>
                      {log.status === 'SENT' ? 'Đã gửi' : log.status === 'FAILED' ? 'Lỗi' : 'Đang chờ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.length ? (
            <p className="text-slate-gray py-6 text-center text-sm">Chưa có lượt gửi email.</p>
          ) : null}
        </div>
        <nav aria-label="Phân trang lịch sử email" className="flex items-center justify-between text-sm">
          <span className="text-slate-gray">
            Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <div className="flex gap-4">
            {page > 1 ? (
              <Link href={`?page=${page - 1}`} className="text-primary">
                ← Trước
              </Link>
            ) : null}
            {page * pageSize < total ? (
              <Link href={`?page=${page + 1}`} className="text-primary">
                Tiếp →
              </Link>
            ) : null}
          </div>
        </nav>
      </Card>
    </div>
  );
}
