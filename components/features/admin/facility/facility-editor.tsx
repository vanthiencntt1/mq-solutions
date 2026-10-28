'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, CheckCircle2, ImagePlus, RefreshCw, Save } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Alert, FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { FacilityRow } from '@/lib/domain/admin/facility-ports';
import { FacilityCreateSchema, type FacilityCreateInput } from '@/lib/domain/admin/facility-schemas';
import { defaultFixedSchedule } from '@/lib/domain/booking/schedule';
import { formatDateTime } from '@/lib/utils/format';
import { FixedScheduleEditor } from './fixed-schedule-editor';

type View = FacilityRow & { secretAvailable: boolean; webhookKeyAvailable: boolean };
type FacilityDraft = Omit<FacilityCreateInput, 'status'> & { status: FacilityRow['status'] };
type Tab = 'info' | 'connection' | 'booking' | 'payment' | 'display';
const tabs: { id: Tab; label: string }[] = [
  { id: 'info', label: 'Thông tin' },
  { id: 'connection', label: 'Kết nối ApiDatKham' },
  { id: 'booking', label: 'Đặt khám' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'display', label: 'Hiển thị' },
];
const selectClass = 'border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm';
const textareaClass =
  'border-input bg-card text-foreground min-h-28 w-full rounded-md border px-3 py-2 text-sm';

const empty: FacilityDraft = {
  code: '',
  slug: '',
  name: '',
  type: 'BV_CONG',
  provinceName: '',
  address: '',
  lat: null,
  lng: null,
  hotline: null,
  workingHours: {},
  logoUrl: null,
  images: [],
  shortDesc: null,
  introJson: null,
  apiBaseUrl: '',
  partnerCode: 'MQ_WEB',
  secretRef: '',
  timeoutMs: 5000,
  payProvider: 'SEPAY',
  bankCode: null,
  bankAccountNo: null,
  bankAccountName: null,
  webhookKeyRef: null,
  bookingMode: 'SPECIALTY',
  allowBhyt: false,
  allowSameDay: false,
  scheduleSource: 'HIS',
  fixedSchedule: null,
  payOptions: ['ONLINE', 'AT_FACILITY'],
  cancelCutoff: 'D-1 15:00',
  reconcileTime: '21:00',
  featured: false,
  sortOrder: 0,
  status: 'INACTIVE',
};

export function FacilityEditor({ initial, editable }: { initial?: View; editable: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');
  const [draft, setDraft] = useState<FacilityDraft>(() => (initial ? { ...initial } : { ...empty }));
  const [hoursText, setHoursText] = useState(JSON.stringify(initial?.workingHours ?? {}, null, 2));
  const [introText, setIntroText] = useState(JSON.stringify(initial?.introJson ?? [], null, 2));
  const [password, setPassword] = useState('');
  const [health, setHealth] = useState(initial?.health ?? 'UNKNOWN');
  const [status, setStatus] = useState(initial?.status ?? 'INACTIVE');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  function set<K extends keyof FacilityDraft>(key: K, value: FacilityDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function execute(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể thực hiện thao tác');
      return false;
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let hours: unknown;
    let intro: unknown;
    try {
      hours = JSON.parse(hoursText);
      intro = JSON.parse(introText);
    } catch {
      setError('Giờ làm việc hoặc giới thiệu phải là JSON hợp lệ.');
      return;
    }
    if (draft.scheduleSource === 'FIXED') {
      if (!draft.fixedSchedule?.doctorId) {
        setError('Khung giờ cố định: nhập mã bác sĩ mặc định (HIS bắt buộc khi đặt).');
        return;
      }
      if (draft.bookingMode !== 'SPECIALTY') {
        setError('Khung giờ cố định chỉ dùng với cách chọn "Theo chuyên khoa / phòng khám".');
        return;
      }
    }
    const parsed = FacilityCreateSchema.safeParse({ ...draft, status: 'INACTIVE', workingHours: hours, introJson: intro });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
      return;
    }
    const payload = parsed.data;
    if (!initial) {
      let created: { id: string } | undefined;
      const done = await execute(async () => {
        created = await apiFetch<{ id: string }>('/api/admin/facilities', { method: 'POST', body: payload });
      }, 'Đã tạo cơ sở. Hãy kiểm tra kết nối trước khi bật hoạt động.');
      if (done && created) router.push(`/admin/co-so/${created.id}`);
      return;
    }
    const { code: _code, status: _status, ...changes } = payload;
    const done = await execute(
      () =>
        apiFetch(`/api/admin/facilities/${initial.id}`, {
          method: 'PATCH',
          body: { ...changes, confirmPassword: password || undefined },
        }),
      'Đã lưu cấu hình cơ sở.',
    );
    if (done) setPassword('');
  }

  async function changeStatus(next: FacilityRow['status']) {
    if (!initial) return;
    const done = await execute(
      () =>
        apiFetch(`/api/admin/facilities/${initial.id}/status`, { method: 'POST', body: { status: next } }),
      'Đã cập nhật trạng thái cơ sở.',
    );
    if (done) setStatus(next);
  }

  async function checkConnection() {
    if (!initial) return;
    let result: { health: string; durationMs: number; message: string } | undefined;
    const done = await execute(async () => {
      result = await apiFetch(`/api/admin/facilities/${initial.id}/check-connection`, { method: 'POST' });
    }, 'Đã kiểm tra kết nối.');
    if (done && result) {
      setHealth(result.health);
      setNotice(`${result.message} · ${result.durationMs} ms`);
    }
  }

  async function upload(file: File | undefined, kind: 'logo' | 'image') {
    if (!initial || !file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Ảnh phải là JPEG, PNG hoặc WebP và không quá 10 MB.');
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('Không đọc được ảnh'));
      reader.readAsDataURL(file);
    });
    let result: { url: string } | undefined;
    const done = await execute(async () => {
      result = await apiFetch(`/api/admin/facilities/${initial.id}/media`, {
        method: 'POST',
        body: { kind, mime: file.type, data },
      });
    }, 'Đã tải ảnh lên.');
    if (done && result)
      set(
        kind === 'logo' ? 'logoUrl' : 'images',
        kind === 'logo' ? result.url : [...draft.images, result.url],
      );
  }

  function testQr() {
    if (!draft.bankCode || !draft.bankAccountNo) {
      setError('Cần mã ngân hàng và số tài khoản để tạo QR thử.');
      return;
    }
    const base = `https://img.vietqr.io/image/${encodeURIComponent(draft.bankCode)}-${encodeURIComponent(draft.bankAccountNo)}-compact2.png`;
    setQrUrl(
      `${base}?amount=1000&addInfo=${encodeURIComponent(`MQ_TEST_${draft.code}`)}&accountName=${encodeURIComponent(draft.bankAccountName ?? '')}`,
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link
        href="/admin/co-so"
        className="text-slate-gray inline-flex items-center gap-2 text-sm hover:underline"
      >
        <ArrowLeft size={16} /> Danh sách cơ sở
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">A02 · CẤU HÌNH CƠ SỞ</p>
          <h1 className="text-ink-navy mt-1 text-[28px] font-bold">
            {initial ? initial.name : 'Thêm cơ sở y tế'}
          </h1>
          <p className="text-slate-gray mt-1 text-sm">
            {initial
              ? `${initial.code} · Cập nhật ${formatDateTime(initial.updatedAt)}`
              : 'Cấu hình thông tin, kết nối HIS và chính sách đặt khám.'}
          </p>
        </div>
        {initial ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                health === 'OK'
                  ? 'success'
                  : health === 'DEGRADED'
                    ? 'warning'
                    : health === 'DOWN'
                      ? 'danger'
                      : 'neutral'
              }
            >
              <Activity size={14} /> HIS {health}
            </Badge>
            <Badge tone={status === 'ACTIVE' ? 'success' : status === 'PAUSED' ? 'warning' : 'neutral'}>
              {status === 'ACTIVE' ? 'Hoạt động' : status === 'PAUSED' ? 'Tạm ngưng' : 'Ẩn'}
            </Badge>
          </div>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? (
        <Alert tone="success">
          <CheckCircle2 size={16} className="mr-2 inline" />
          {notice}
        </Alert>
      ) : null}
      <Card className="p-0">
        <nav aria-label="Các mục cấu hình" className="border-border flex gap-1 overflow-x-auto border-b p-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`rounded-md px-4 py-3 text-sm font-semibold whitespace-nowrap ${tab === item.id ? 'bg-info-bg text-info' : 'text-slate-gray hover:bg-muted'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <form onSubmit={save} className="space-y-6 p-4 sm:p-6">
          {tab === 'info' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="code" label="Mã cơ sở" hint="Không đổi sau khi tạo">
                <Input
                  id="code"
                  value={draft.code}
                  disabled={Boolean(initial) || !editable}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                />
              </FormField>
              <FormField id="slug" label="Đường dẫn (slug)">
                <Input
                  id="slug"
                  value={draft.slug}
                  disabled={!editable}
                  onChange={(e) => set('slug', e.target.value)}
                />
              </FormField>
              <FormField id="name" label="Tên cơ sở">
                <Input
                  id="name"
                  value={draft.name}
                  disabled={!editable}
                  onChange={(e) => set('name', e.target.value)}
                />
              </FormField>
              <FormField id="type" label="Loại cơ sở">
                <select
                  id="type"
                  className={selectClass}
                  value={draft.type}
                  disabled={!editable}
                  onChange={(e) => set('type', e.target.value as FacilityCreateInput['type'])}
                >
                  {['BV_CONG', 'BV_TU', 'PHONG_KHAM', 'PHONG_MACH', 'XET_NGHIEM'].map((v) => (
                    <option key={v} value={v}>
                      {v.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="province" label="Tỉnh / thành phố">
                <Input
                  id="province"
                  value={draft.provinceName}
                  disabled={!editable}
                  onChange={(e) => set('provinceName', e.target.value)}
                />
              </FormField>
              <FormField id="address" label="Địa chỉ">
                <Input
                  id="address"
                  value={draft.address}
                  disabled={!editable}
                  onChange={(e) => set('address', e.target.value)}
                />
              </FormField>
              <FormField id="lat" label="Vĩ độ">
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={draft.lat ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('lat', e.target.value ? Number(e.target.value) : null)}
                />
              </FormField>
              <FormField id="lng" label="Kinh độ">
                <Input
                  id="lng"
                  type="number"
                  step="any"
                  value={draft.lng ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('lng', e.target.value ? Number(e.target.value) : null)}
                />
              </FormField>
              <FormField id="hotline" label="Hotline">
                <Input
                  id="hotline"
                  value={draft.hotline ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('hotline', e.target.value || null)}
                />
              </FormField>
              <FormField id="short" label="Mô tả ngắn">
                <Input
                  id="short"
                  value={draft.shortDesc ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('shortDesc', e.target.value || null)}
                />
              </FormField>
              <FormField id="hours" label="Giờ làm việc (JSON)" className="sm:col-span-2">
                <textarea
                  id="hours"
                  className={textareaClass}
                  value={hoursText}
                  disabled={!editable}
                  onChange={(e) => setHoursText(e.target.value)}
                />
              </FormField>
              <FormField id="intro" label="Giới thiệu dạng khối (JSON)" className="sm:col-span-2">
                <textarea
                  id="intro"
                  className={textareaClass}
                  value={introText}
                  disabled={!editable}
                  onChange={(e) => setIntroText(e.target.value)}
                />
              </FormField>
              {initial && editable ? (
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                  <label className="text-slate-gray text-sm">
                    Logo{' '}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="mt-1 block"
                      onChange={(e) => void upload(e.target.files?.[0], 'logo')}
                    />
                  </label>
                  <label className="text-slate-gray text-sm">
                    Ảnh cơ sở{' '}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="mt-1 block"
                      onChange={(e) => void upload(e.target.files?.[0], 'image')}
                    />
                  </label>
                  <span className="text-slate-gray flex items-center gap-1 text-sm">
                    <ImagePlus size={16} />
                    {draft.images.length} ảnh
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {tab === 'connection' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="url" label="URL ApiDatKham" className="sm:col-span-2">
                <Input
                  id="url"
                  value={draft.apiBaseUrl}
                  disabled={!editable}
                  onChange={(e) => set('apiBaseUrl', e.target.value)}
                />
              </FormField>
              <FormField id="partner" label="Mã đối tác">
                <Input
                  id="partner"
                  value={draft.partnerCode}
                  disabled={!editable}
                  onChange={(e) => set('partnerCode', e.target.value)}
                />
              </FormField>
              <FormField
                id="secret"
                label="Tên biến khóa HIS"
                hint="Chỉ lưu tên biến, không nhập giá trị khóa"
              >
                <Input
                  id="secret"
                  value={draft.secretRef}
                  disabled={!editable}
                  onChange={(e) => set('secretRef', e.target.value.toUpperCase())}
                />
              </FormField>
              <FormField id="timeout" label="Timeout (ms)">
                <Input
                  id="timeout"
                  type="number"
                  min={1000}
                  max={10000}
                  value={draft.timeoutMs}
                  disabled={!editable}
                  onChange={(e) => set('timeoutMs', Number(e.target.value))}
                />
              </FormField>
              {initial ? (
                <p className="text-slate-gray self-end text-sm">
                  Biến HIS: {initial.secretAvailable ? '✓ Đã cấu hình' : '⚠ Chưa có trong môi trường'}
                </p>
              ) : null}
              {initial && editable ? (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void checkConnection()}
                  >
                    <Activity size={16} /> Kiểm tra kết nối
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      void execute(
                        () => apiFetch(`/api/admin/facilities/${initial.id}/clear-cache`, { method: 'POST' }),
                        'Đã xóa cache cơ sở.',
                      )
                    }
                  >
                    <RefreshCw size={16} /> Xóa cache cơ sở
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {tab === 'booking' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="booking" label="Cách chọn khi đặt khám">
                <select
                  id="booking"
                  className={selectClass}
                  value={draft.bookingMode}
                  disabled={!editable}
                  onChange={(e) => set('bookingMode', e.target.value as FacilityCreateInput['bookingMode'])}
                >
                  <option value="SPECIALTY">Theo chuyên khoa / phòng khám</option>
                  <option value="DOCTOR">Theo bác sĩ</option>
                  <option value="BOTH">Bệnh nhân tự chọn</option>
                </select>
              </FormField>
              <FormField id="schedule-source" label="Nguồn lịch khám">
                <select
                  id="schedule-source"
                  className={selectClass}
                  value={draft.scheduleSource}
                  disabled={!editable}
                  onChange={(e) => {
                    const next = e.target.value as FacilityCreateInput['scheduleSource'];
                    setDraft((current) => ({
                      ...current,
                      scheduleSource: next,
                      fixedSchedule:
                        next === 'FIXED' && !current.fixedSchedule ? { ...defaultFixedSchedule } : current.fixedSchedule,
                    }));
                  }}
                >
                  <option value="HIS">Theo lịch HIS (DMBSKHAMBENH)</option>
                  <option value="FIXED">Khung giờ cố định – STT nhỏ nhất</option>
                </select>
              </FormField>
              {draft.scheduleSource === 'FIXED' && draft.fixedSchedule ? (
                <FixedScheduleEditor
                  value={draft.fixedSchedule}
                  editable={editable}
                  onChange={(next) => set('fixedSchedule', next)}
                />
              ) : null}
              <FormField id="cutoff" label="Giờ chốt hủy" hint="Ví dụ D-1 15:00">
                <Input
                  id="cutoff"
                  value={draft.cancelCutoff}
                  disabled={!editable}
                  onChange={(e) => set('cancelCutoff', e.target.value)}
                />
              </FormField>
              <FormField id="reconcile" label="Giờ đối soát">
                <Input
                  id="reconcile"
                  type="time"
                  value={draft.reconcileTime}
                  disabled={!editable}
                  onChange={(e) => set('reconcileTime', e.target.value)}
                />
              </FormField>
              <div className="space-y-3 sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.allowBhyt}
                    disabled={!editable}
                    onChange={(e) => set('allowBhyt', e.target.checked)}
                  />{' '}
                  Cho đặt BHYT
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.allowSameDay}
                    disabled={!editable}
                    onChange={(e) => set('allowSameDay', e.target.checked)}
                  />{' '}
                  Cho đặt trong ngày (phải khớp HIS)
                </label>
                <div className="flex flex-wrap gap-4">
                  {(['ONLINE', 'AT_FACILITY'] as const).map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.payOptions.includes(option)}
                        disabled={!editable}
                        onChange={(e) =>
                          set(
                            'payOptions',
                            e.target.checked
                              ? [...draft.payOptions, option]
                              : draft.payOptions.filter((v) => v !== option),
                          )
                        }
                      />
                      {option === 'ONLINE' ? 'Online' : 'Tại viện'}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {tab === 'payment' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="provider" label="Cổng thanh toán">
                <select
                  id="provider"
                  className={selectClass}
                  value={draft.payProvider}
                  disabled={!editable}
                  onChange={(e) => set('payProvider', e.target.value as FacilityCreateInput['payProvider'])}
                >
                  <option value="SEPAY">SePay – đọc biến động số dư</option>
                  <option value="PAYOS">PayOS – mã QR theo đơn, có trang thanh toán</option>
                </select>
              </FormField>
              <FormField id="bank" label="Mã ngân hàng">
                <Input
                  id="bank"
                  value={draft.bankCode ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('bankCode', e.target.value.toUpperCase() || null)}
                />
              </FormField>
              <FormField id="account" label="Số tài khoản">
                <Input
                  id="account"
                  value={draft.bankAccountNo ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('bankAccountNo', e.target.value || null)}
                />
              </FormField>
              <FormField id="holder" label="Tên chủ tài khoản">
                <Input
                  id="holder"
                  value={draft.bankAccountName ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('bankAccountName', e.target.value || null)}
                />
              </FormField>
              <FormField
                id="webhook"
                label={draft.payProvider === 'PAYOS' ? 'Tiền tố biến khóa PayOS' : 'Tên biến khóa webhook'}
                hint={
                  draft.payProvider === 'PAYOS'
                    ? 'VD PAYOS_BVQ7 → cần PAYOS_BVQ7_CLIENT_ID, _API_KEY, _CHECKSUM_KEY. Không nhập giá trị khóa'
                    : 'Không nhập giá trị khóa'
                }
              >
                <Input
                  id="webhook"
                  value={draft.webhookKeyRef ?? ''}
                  disabled={!editable}
                  onChange={(e) => set('webhookKeyRef', e.target.value.toUpperCase() || null)}
                />
              </FormField>
              <FormField id="webhook-url" label="URL webhook cơ sở">
                <Input
                  id="webhook-url"
                  readOnly
                  value={
                    initial
                      ? `/api/payment/${draft.payProvider === 'PAYOS' ? 'payos' : 'sepay'}/${initial.code}`
                      : 'Tạo cơ sở để nhận URL'
                  }
                />
              </FormField>
              {initial ? (
                <p className="text-slate-gray text-sm">
                  Biến webhook: {initial.webhookKeyAvailable ? '✓ Đã cấu hình' : '⚠ Chưa có trong môi trường'}
                </p>
              ) : null}
              <div className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={testQr}>
                  Tạo QR thử 1.000đ
                </Button>
                {qrUrl ? (
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary ml-4 font-semibold underline"
                  >
                    Mở QR thử ↗
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          {tab === 'display' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="order" label="Thứ tự hiển thị">
                <Input
                  id="order"
                  type="number"
                  min={0}
                  value={draft.sortOrder}
                  disabled={!editable}
                  onChange={(e) => set('sortOrder', Number(e.target.value))}
                />
              </FormField>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  disabled={!editable}
                  onChange={(e) => set('featured', e.target.checked)}
                />{' '}
                Nổi bật trang chủ
              </label>
            </div>
          ) : null}
          {editable ? (
            <div className="border-border flex flex-wrap items-end gap-4 border-t pt-5">
              <FormField
                id="confirm-password"
                label="Xác nhận mật khẩu"
                hint="Bắt buộc khi đổi URL, tên biến HIS hoặc số tài khoản"
              >
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>
              <Button type="submit" disabled={pending}>
                <Save size={16} />
                {initial ? 'Lưu thay đổi' : 'Tạo cơ sở'}
              </Button>
            </div>
          ) : null}
        </form>
      </Card>
      {initial && editable ? (
        <Card>
          <h2 className="text-ink-navy mb-3 font-semibold">Trạng thái đặt khám</h2>
          <p className="text-slate-gray mb-4 text-sm">
            Tạm ngưng chặn lịch mới; Ẩn bỏ cơ sở khỏi danh sách công khai. Lịch đã đặt vẫn giữ.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending || status === 'ACTIVE'}
              onClick={() => void changeStatus('ACTIVE')}
            >
              Bật hoạt động
            </Button>
            <Button
              variant="outline"
              disabled={pending || status === 'PAUSED'}
              onClick={() => void changeStatus('PAUSED')}
            >
              Tạm ngưng
            </Button>
            <Button
              variant="outline"
              disabled={pending || status === 'INACTIVE'}
              onClick={() => void changeStatus('INACTIVE')}
            >
              Ẩn cơ sở
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
