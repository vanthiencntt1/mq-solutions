'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CircleAlert,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  LogOut,
  UnlockKeyhole,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';

type Patient = {
  id: string;
  fullName: string;
  cccdMasked: string;
  phoneMasked: string;
  emailMasked: string;
  birthYear: number;
  gender: number;
  status: string;
  failedCount: number;
  lockedUntil: string | null;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletionRequestedAt: string | null;
};
type Appointment = {
  id: string;
  code: string;
  facilityName: string;
  examDate: string;
  status: string;
  amountVnd: number;
  createdAt: string;
};
type Appointments = { rows: Appointment[]; total: number; page: number; pageSize: number };
type Event = { action: string; module: string; at: string; actorType: string };
type Action = 'LOCK' | 'UNLOCK' | 'DISPUTE' | 'LOGOUT_ALL' | 'RESET_PASSWORD' | 'DELETE';

const statusText: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  DISPUTED: 'Đang tranh chấp',
  DELETED: 'Đã xóa',
};
const actionText: Record<Action, string> = {
  LOCK: 'Khóa tài khoản',
  UNLOCK: 'Mở khóa',
  DISPUTE: 'Đánh dấu tranh chấp',
  LOGOUT_ALL: 'Đăng xuất mọi thiết bị',
  RESET_PASSWORD: 'Cấp lại mật khẩu',
  DELETE: 'Xử lý yêu cầu xóa',
};

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Không đọc được ảnh giấy tờ'));
    reader.readAsDataURL(file);
  });
}

export function AdminPatientDetail({
  patient,
  appointments: initialAppointments,
  events,
  central,
  canReveal,
  canReset,
}: {
  patient: Patient;
  appointments: Appointments;
  events: Event[];
  central: boolean;
  canReveal: boolean;
  canReset: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [cccd, setCccd] = useState('');
  const [appointments, setAppointments] = useState(initialAppointments);
  const [form, setForm] = useState({
    cccd: '',
    fullName: '',
    birthYear: '',
    gender: '',
    phone: '',
    email: '',
  });
  const [evidence, setEvidence] = useState<File | null>(null);

  useEffect(() => {
    if (!cccd) return;
    const timer = window.setTimeout(() => setCccd(''), 30_000);
    return () => window.clearTimeout(timer);
  }, [cccd]);

  async function run(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await task();
      setNotice(success);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Không thể thực hiện thao tác',
      );
    } finally {
      setPending(false);
    }
  }

  function action(name: Action) {
    if (reason.trim().length < 8) {
      setError('Vui lòng ghi lý do ít nhất 8 ký tự.');
      return;
    }
    if (
      name === 'DELETE' &&
      !window.confirm('Ẩn danh hóa tài khoản theo yêu cầu đã nhận? Thao tác này không thể hoàn tác.')
    )
      return;
    void run(
      () =>
        apiFetch(`/api/admin/patients/${patient.id}/actions`, {
          method: 'POST',
          body: { action: name, reason: reason.trim() },
        }),
      name === 'RESET_PASSWORD'
        ? 'Đã gửi mật khẩu tạm qua email.'
        : `Đã thực hiện: ${actionText[name].toLowerCase()}.`,
    );
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evidence) {
      setError('Cần ảnh giấy tờ xác minh.');
      return;
    }
    if (evidence.size > 5_000_000) {
      setError('Ảnh giấy tờ tối đa 5 MB.');
      return;
    }
    const changes = Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim()));
    if (!Object.keys(changes).length) {
      setError('Cần nhập ít nhất một thông tin cần sửa.');
      return;
    }
    if (changes.birthYear) changes.birthYear = Number(changes.birthYear) as never;
    if (changes.gender) changes.gender = Number(changes.gender) as never;
    await run(async () => {
      await apiFetch(`/api/admin/patients/${patient.id}`, {
        method: 'PATCH',
        body: {
          ...changes,
          reason: reason.trim(),
          evidence: { mime: evidence.type, base64: await fileBase64(evidence) },
        },
      });
      setForm({ cccd: '', fullName: '', birthYear: '', gender: '', phone: '', email: '' });
      setEvidence(null);
    }, 'Đã cập nhật thông tin và xóa cache tra hồ sơ.');
  }

  async function reveal() {
    await run(async () => {
      const value = await apiFetch<{ cccd: string }>(`/api/admin/patients/${patient.id}/reveal`, {
        method: 'POST',
      });
      setCccd(value.cccd);
    }, 'CCCD đầy đủ tự ẩn sau 30 giây; thao tác đã được ghi nhật ký.');
  }

  async function appointmentPage(page: number) {
    await run(async () => {
      const rows = await apiFetch<Appointment[]>(
        `/api/admin/patients/${patient.id}/appointments?page=${page}`,
      );
      setAppointments({ ...appointments, rows, page });
    }, 'Đã tải danh sách phiếu khám.');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/benh-nhan"
          className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Tra cứu tài khoản
        </Link>
        <h1 className="text-ink-navy text-[28px] font-bold">Chi tiết tài khoản</h1>
        <p className="text-slate-gray text-sm">A05 · Thông tin và thao tác quản trị bệnh nhân</p>
      </header>
      {error ? (
        <Alert tone="danger">
          <CircleAlert size={17} className="mr-2 inline" />
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success">
          <ShieldCheck size={17} className="mr-2 inline" />
          {notice}
        </Alert>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-5">
          <h2 className="text-ink-navy flex items-center gap-2 text-lg font-semibold">
            <UserRound size={20} /> Thông tin bệnh nhân
          </h2>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-gray">Họ tên</dt>
              <dd className="text-ink-navy font-semibold">{patient.fullName}</dd>
            </div>
            <div>
              <dt className="text-slate-gray">Trạng thái</dt>
              <dd className="text-ink-navy flex items-center gap-1 font-semibold">
                <ShieldCheck size={16} /> {statusText[patient.status] ?? patient.status}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">CCCD</dt>
              <dd className="text-ink-navy flex flex-wrap items-center gap-2 font-mono">
                {cccd || patient.cccdMasked}
                {canReveal ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => (cccd ? setCccd('') : void reveal())}
                  >
                    {cccd ? <EyeOff size={15} /> : <Eye size={15} />}
                    {cccd ? 'Ẩn' : 'Xem đầy đủ'}
                  </Button>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Liên hệ</dt>
              <dd className="text-ink-navy">
                {patient.phoneMasked}
                <br />
                {patient.emailMasked}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Năm sinh · giới tính</dt>
              <dd className="text-ink-navy">
                {patient.birthYear} · {patient.gender === 1 ? 'Nam' : 'Nữ'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Ngày tạo</dt>
              <dd className="text-ink-navy">{formatDateTime(patient.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-gray">Đăng nhập cuối</dt>
              <dd className="text-ink-navy">
                {patient.lastLoginAt ? formatDateTime(patient.lastLoginAt) : 'Chưa đăng nhập'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Đổi mật khẩu cuối</dt>
              <dd className="text-ink-navy">
                {patient.passwordChangedAt ? formatDateTime(patient.passwordChangedAt) : 'Chưa đổi'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Số lần sai</dt>
              <dd className="text-ink-navy">{patient.failedCount}</dd>
            </div>
            <div>
              <dt className="text-slate-gray">Khóa đến</dt>
              <dd className="text-ink-navy">
                {patient.lockedUntil ? formatDateTime(patient.lockedUntil) : 'Không'}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-ink-navy flex items-center gap-2 text-lg font-semibold">
            <LockKeyhole size={20} /> Bảo mật và xử lý
          </h2>
          <FormField id="action-reason" label="Lý do thao tác" hint="Lưu vào nhật ký; tối thiểu 8 ký tự">
            <Input
              id="action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            {central && patient.status === 'ACTIVE' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => action('LOCK')}
              >
                <LockKeyhole size={16} /> Khóa
              </Button>
            ) : null}
            {central && patient.status === 'LOCKED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => action('UNLOCK')}
              >
                <UnlockKeyhole size={16} /> Mở khóa
              </Button>
            ) : null}
            {central && patient.status !== 'DISPUTED' && patient.status !== 'DELETED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => action('DISPUTE')}
              >
                <ShieldAlert size={16} /> Tranh chấp
              </Button>
            ) : null}
            {central && patient.status !== 'DELETED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => action('LOGOUT_ALL')}
              >
                <LogOut size={16} /> Đăng xuất tất cả
              </Button>
            ) : null}
            {canReset && patient.status !== 'DISPUTED' && patient.status !== 'DELETED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => action('RESET_PASSWORD')}
              >
                <KeyRound size={16} /> Cấp lại mật khẩu
              </Button>
            ) : null}
          </div>
          {patient.deletionRequestedAt ? (
            <div className="border-border rounded-md border p-4">
              <p className="text-ink-navy text-sm font-semibold">
                Yêu cầu xóa từ {formatDateTime(patient.deletionRequestedAt)}
              </p>
              <p className="text-slate-gray mt-1 text-sm">
                Thông tin cá nhân trên web sẽ được ẩn danh; phiếu và thanh toán giữ cho kế toán.
              </p>
              {central && patient.status !== 'DELETED' ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  disabled={pending}
                  onClick={() => action('DELETE')}
                >
                  <Trash2 size={16} /> Xử lý xóa
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
      {central && patient.status !== 'DELETED' ? (
        <Card>
          <h2 className="text-ink-navy mb-2 text-lg font-semibold">Cập nhật thông tin đã xác minh</h2>
          <p className="text-slate-gray mb-4 text-sm">
            Cần lý do ở trên và ảnh giấy tờ. Thông tin định danh thay đổi sẽ xóa cache tra hồ sơ.
          </p>
          <form onSubmit={(event) => void update(event)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField id="edit-cccd" label="CCCD mới">
              <Input
                id="edit-cccd"
                inputMode="numeric"
                maxLength={12}
                value={form.cccd}
                onChange={(e) => setForm({ ...form, cccd: e.target.value })}
                autoComplete="off"
              />
            </FormField>
            <FormField id="edit-name" label="Họ tên mới">
              <Input
                id="edit-name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </FormField>
            <FormField id="edit-year" label="Năm sinh mới">
              <Input
                id="edit-year"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
              />
            </FormField>
            <FormField id="edit-gender" label="Giới tính mới">
              <select
                id="edit-gender"
                className="border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Giữ nguyên</option>
                <option value="1">Nam</option>
                <option value="0">Nữ</option>
              </select>
            </FormField>
            <FormField id="edit-phone" label="SĐT mới">
              <Input
                id="edit-phone"
                inputMode="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField id="edit-email" label="Email mới">
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField
              id="edit-evidence"
              label="Ảnh giấy tờ xác minh"
              hint="JPG, PNG hoặc WebP · tối đa 5 MB"
              className="sm:col-span-2"
            >
              <Input
                id="edit-evidence"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setEvidence(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" disabled={pending}>
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-x-auto p-0">
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-ink-navy flex items-center gap-2 font-semibold">
              <ClipboardList size={18} /> Lịch sử phiếu khám
            </h2>
            <span className="text-slate-gray text-sm">{appointments.total} phiếu</span>
          </div>
          {appointments.rows.length ? (
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead className="bg-muted text-slate-gray">
                <tr>
                  <th className="px-5 py-3">Mã phiếu</th>
                  <th className="px-5 py-3">Cơ sở · ngày khám</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Tiền</th>
                </tr>
              </thead>
              <tbody>
                {appointments.rows.map((item) => (
                  <tr key={item.id} className="border-border border-t">
                    <td className="text-ink-navy px-5 py-3 font-semibold">{item.code}</td>
                    <td className="px-5 py-3">
                      {item.facilityName}
                      <br />
                      <span className="text-slate-gray">{formatDate(item.examDate)}</span>
                    </td>
                    <td className="px-5 py-3">{item.status.replaceAll('_', ' ')}</td>
                    <td className="px-5 py-3">{formatMoney(item.amountVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-gray p-6 text-sm">Chưa có phiếu khám.</p>
          )}
          {appointments.total > appointments.pageSize ? (
            <nav
              aria-label="Phân trang phiếu khám"
              className="border-border flex justify-between border-t px-5 py-4 text-sm"
            >
              <span>
                Trang {appointments.page} / {Math.ceil(appointments.total / appointments.pageSize)}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || appointments.page === 1}
                  onClick={() => void appointmentPage(appointments.page - 1)}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || appointments.page * appointments.pageSize >= appointments.total}
                  onClick={() => void appointmentPage(appointments.page + 1)}
                >
                  Tiếp
                </Button>
              </div>
            </nav>
          ) : null}
        </Card>
        <Card>
          <h2 className="text-ink-navy mb-4 text-lg font-semibold">Nhật ký gần đây</h2>
          {events.length ? (
            <ol className="space-y-3 text-sm">
              {events.map((item, index) => (
                <li key={`${item.at}-${index}`} className="border-border border-b pb-3 last:border-0">
                  <span className="text-ink-navy block font-medium">{item.action.replaceAll('_', ' ')}</span>
                  <span className="text-slate-gray">
                    {item.at} · {item.actorType}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-gray text-sm">Chưa có nhật ký.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
