'use client';

import { CircleAlert, CircleCheck, Hospital, LoaderCircle, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/components/common/api-client';
import { BookingStepper } from '@/components/features/booking/booking-stepper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type { PreparedBooking } from '@/lib/domain/booking/confirm';

type Prepared = PreparedBooking;
type Location = { id: string; name: string };
const url = (code: string, kind: string, parent?: string) =>
  `/api/facilities/${encodeURIComponent(code)}/locations/${kind}${parent ? `?${kind === 'districts' ? 'city' : 'district'}=${encodeURIComponent(parent)}` : ''}`;

export function PatientStep({ data }: { data: Prepared }) {
  const router = useRouter();
  const isNew = data.patient.status === 'NEW_PATIENT';
  const [cities, setCities] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [wards, setWards] = useState<Location[]>([]);
  const [cityId, setCityId] = useState(data.address?.cityId ?? '');
  const [districtId, setDistrictId] = useState(data.address?.districtId ?? '');
  const [wardId, setWardId] = useState(data.address?.wardId ?? '');
  const [address, setAddress] = useState(data.address?.address ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (!isNew) return;
    let live = true;
    setLoadingLocations(true);
    apiFetch<Location[]>(url(data.draft.facilityCode, 'cities'))
      .then((rows) => {
        if (live) setCities(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : 'Không tải được tỉnh/thành');
      })
      .finally(() => {
        if (live) setLoadingLocations(false);
      });
    return () => {
      live = false;
    };
  }, [data.draft.facilityCode, isNew]);

  useEffect(() => {
    if (!cityId) return;
    let live = true;
    apiFetch<Location[]>(url(data.draft.facilityCode, 'districts', cityId))
      .then((rows) => {
        if (live) setDistricts(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : 'Không tải được quận/huyện');
      });
    return () => {
      live = false;
    };
  }, [cityId, data.draft.facilityCode]);

  useEffect(() => {
    if (!districtId) return;
    let live = true;
    apiFetch<Location[]>(url(data.draft.facilityCode, 'wards', districtId))
      .then((rows) => {
        if (live) setWards(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : 'Không tải được phường/xã');
      });
    return () => {
      live = false;
    };
  }, [districtId, data.draft.facilityCode]);

  async function proceed() {
    setBusy(true);
    setError('');
    try {
      if (isNew)
        await apiFetch('/api/bookings/patient', {
          body: {
            draftId: data.draft.id,
            address: { cityId, districtId, wardId, address },
          },
        });
      router.push(`/dat-kham/xac-nhan?draft=${data.draft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được địa chỉ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <BookingStepper current={1} />
      <header>
        <p className="text-primary text-sm font-semibold">CHẶNG 2 / 4</p>
        <h1 className="text-ink-navy text-3xl font-bold">Hồ sơ bệnh nhân</h1>
        <p className="text-slate-gray mt-2">
          Kiểm tra thông tin tại {data.draft.facilityName} trước khi tiếp tục.
        </p>
      </header>
      {error && (
        <Alert tone="danger">
          <CircleAlert className="mr-2 inline size-4" aria-hidden />
          {error}
        </Alert>
      )}
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserRound className="text-primary size-5" aria-hidden />
          Thông tin bệnh nhân
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <p>
            <span className="text-slate-gray block text-sm">Họ tên</span>
            <strong>{data.patient.nameMasked}</strong>
          </p>
          <p>
            <span className="text-slate-gray block text-sm">Năm sinh</span>
            <strong>{data.patient.birthYear}</strong>
          </p>
          <p>
            <span className="text-slate-gray block text-sm">Điện thoại</span>
            <strong>{data.patient.phoneMasked}</strong>
          </p>
          <p>
            <span className="text-slate-gray block text-sm">Mã bệnh nhân</span>
            <strong>{data.patient.maBNMasked ?? 'Chưa có tại cơ sở'}</strong>
          </p>
        </div>
        <Alert tone={isNew ? 'info' : 'success'}>
          {isNew ? (
            <Hospital className="mr-2 inline size-4" aria-hidden />
          ) : (
            <CircleCheck className="mr-2 inline size-4" aria-hidden />
          )}
          {isNew
            ? 'Hồ sơ HIS sẽ được tạo khi xác nhận đặt khám theo hình thức tại viện hoặc sau khi thanh toán online.'
            : 'Đã tìm thấy hồ sơ tại cơ sở.'}
        </Alert>
      </Card>
      {isNew && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Địa chỉ để tạo hồ sơ</h2>
          {loadingLocations && (
            <p role="status" className="text-slate-gray">
              <LoaderCircle className="mr-2 inline size-4 animate-spin" aria-hidden />
              Đang tải địa giới của cơ sở…
            </p>
          )}
          <FormField id="city" label="Tỉnh / thành phố">
            <select
              id="city"
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setDistrictId('');
                setWardId('');
              }}
              className="border-hairline h-11 w-full rounded-md border bg-white px-3"
            >
              <option value="">Chọn tỉnh / thành phố</option>
              {cities.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="district" label="Quận / huyện">
            <select
              id="district"
              value={districtId}
              disabled={!cityId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setWardId('');
              }}
              className="border-hairline h-11 w-full rounded-md border bg-white px-3"
            >
              <option value="">Chọn quận / huyện</option>
              {districts.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="ward" label="Phường / xã">
            <select
              id="ward"
              value={wardId}
              disabled={!districtId}
              onChange={(e) => setWardId(e.target.value)}
              className="border-hairline h-11 w-full rounded-md border bg-white px-3"
            >
              <option value="">Chọn phường / xã</option>
              {wards.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="address" label="Số nhà, đường">
            <Input
              id="address"
              value={address}
              maxLength={255}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ví dụ: 12 Nguyễn Huệ"
            />
          </FormField>
        </Card>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Quay lại
        </Button>
        <Button
          onClick={proceed}
          disabled={busy || (isNew && (!cityId || !districtId || !wardId || !address.trim()))}
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}Tiếp tục
        </Button>
      </div>
    </div>
  );
}
