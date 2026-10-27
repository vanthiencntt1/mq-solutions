'use client';

import {
  CalendarDays,
  CircleAlert,
  Clock3,
  Hospital,
  LoaderCircle,
  MapPin,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { track } from '@/components/features/analytics/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { Input, Label } from '@/components/ui/input';
import { specialtyIcon } from '@/components/features/specialty/specialty-icon';
import { bookingDraftInput } from '@/lib/domain/booking/draft';
import {
  priceFor,
  type CatalogFacility,
  type Doctor,
  type ExamSchedule,
  type Room,
  type Specialty,
} from '@/lib/domain/booking/schedule';
import { formatMoney } from '@/lib/utils/format';
import { BookingStepper } from './booking-stepper';
import { BookingSummary } from './booking-summary';
import { BookingPanelHeading } from './booking-panel-heading';

type Slot = { id: number; label: string; remaining: number };
const pendingKey = 'mq:c05:pending';
const url = (code: string, path: string) => `/api/facilities/${encodeURIComponent(code)}/${path}`;
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Không tải được dữ liệu');

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`focus-visible:ring-primary min-h-12 rounded-full border px-4 py-2 text-left text-sm focus-visible:ring-2 ${disabled ? 'border-hairline bg-pebble text-slate-gray' : active ? 'border-primary bg-primary text-primary-foreground' : 'border-hairline text-ink-navy hover:bg-pebble bg-card'}`}
    >
      {children}
    </button>
  );
}
function Loading() {
  return (
    <p role="status" className="text-slate-gray flex items-center gap-2">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      Đang tải dữ liệu…
    </p>
  );
}

function SpecialtyChipIcon({ name }: { name: string }) {
  const Icon = specialtyIcon(name);
  return <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />;
}

// C05 mục 2–5: chặng chọn lịch dùng cùng token và luôn hiện rõ trạng thái trống/lỗi.
export function BookingWizard({
  facilities,
  facilityLogos,
  initialCode,
}: {
  facilities: CatalogFacility[];
  facilityLogos?: Record<string, string | null>;
  initialCode?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? '');
  const facility = facilities.find((f) => f.code === code);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyId, setSpecialtyId] = useState('');
  const [search, setSearch] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mode, setMode] = useState<'ROOM' | 'DOCTOR'>('ROOM');
  const [roomId, setRoomId] = useState<number>();
  const [doctorId, setDoctorId] = useState('');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<number>();
  const [objectType, setObjectType] = useState<'DICH_VU' | 'BHYT'>('DICH_VU');
  const [bhytEligible, setBhytEligible] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    let live = true;
    setBusy('specialties');
    setError('');
    setSpecialtyId('');
    setRoomId(undefined);
    setDoctorId('');
    setDate('');
    setSlotId(undefined);
    Promise.all([
      apiFetch<Specialty[]>(url(code, 'specialties')),
      facility?.allowBhyt
        ? apiFetch<{ status: string; hasVisited?: boolean }>(url(code, 'identify'), { body: {} }).catch(
            () => null,
          )
        : Promise.resolve(null),
    ])
      .then(([rows, ident]) => {
        if (live) {
          setSpecialties(rows);
          setBhytEligible(ident?.status === 'FOUND' && ident.hasVisited === true);
        }
      })
      .catch((e: unknown) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setBusy('');
      });
    return () => {
      live = false;
    };
  }, [code, facility?.allowBhyt]);

  useEffect(() => {
    if (!code || !specialtyId) return;
    let live = true;
    setBusy('choices');
    setError('');
    setRoomId(undefined);
    setDoctorId('');
    setDate('');
    setSlotId(undefined);
    Promise.all([
      apiFetch<Room[]>(url(code, `rooms?specialty=${encodeURIComponent(specialtyId)}`)),
      facility?.bookingMode === 'SPECIALTY'
        ? Promise.resolve([])
        : apiFetch<Doctor[]>(url(code, `doctors?specialty=${encodeURIComponent(specialtyId)}`)),
    ])
      .then(([r, d]) => {
        if (live) {
          setRooms(r);
          setDoctors(d);
          setMode(facility?.bookingMode === 'DOCTOR' && d.length ? 'DOCTOR' : 'ROOM');
        }
      })
      .catch((e: unknown) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setBusy('');
      });
    return () => {
      live = false;
    };
  }, [code, specialtyId, facility?.bookingMode]);

  useEffect(() => {
    if (!code || (mode === 'ROOM' ? !roomId : !doctorId)) return;
    let live = true;
    setBusy('schedules');
    setError('');
    setDate('');
    setSlotId(undefined);
    const query =
      mode === 'ROOM' ? `mode=ROOM&room=${roomId}` : `mode=DOCTOR&doctor=${encodeURIComponent(doctorId)}`;
    apiFetch<ExamSchedule[]>(url(code, `schedules?${query}`))
      .then((rows) => {
        if (live) setSchedules(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setBusy('');
      });
    return () => {
      live = false;
    };
  }, [code, mode, roomId, doctorId]);

  const selectedRoomId = mode === 'DOCTOR' ? schedules.find((s) => s.date === date)?.roomId : roomId;
  useEffect(() => {
    if (!code || !date || !selectedRoomId) return;
    let live = true;
    setBusy('slots');
    setError('');
    setSlotId(undefined);
    apiFetch<Slot[]>(url(code, `slots?room=${selectedRoomId}&date=${date}`))
      .then((rows) => {
        if (live) setSlots(rows);
      })
      .catch((e: unknown) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setBusy('');
      });
    return () => {
      live = false;
    };
  }, [code, date, selectedRoomId]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('draft-pending') !== '1') return;
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) return;
    try {
      const parsed = bookingDraftInput.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        sessionStorage.removeItem(pendingKey);
        return;
      }
      apiFetch<{ id: string }>('/api/booking-drafts', { body: parsed.data })
        .then(({ id }) => {
          sessionStorage.removeItem(pendingKey);
          router.push(`/dat-kham/ho-so?draft=${id}`);
        })
        .catch((e: unknown) => setError(errorMessage(e)));
    } catch {
      sessionStorage.removeItem(pendingKey);
    }
  }, [router]);

  const dates = useMemo(() => [...new Set(schedules.map((s) => s.date))].sort(), [schedules]);
  const specialty = specialties.find((s) => s.id === specialtyId);
  const room = rooms.find((r) => r.id === selectedRoomId);
  const doctor = doctors.find((d) => d.id === doctorId);
  const slot = slots.find((s) => s.id === slotId);
  const normalized = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const visible = specialties.filter((s) => normalized(s.name).includes(normalized(search)));

  async function proceed() {
    if (!facility || !specialty || !room || !slot || !date) return;
    track('booking_started', { booking_mode: mode, object_type: objectType });
    const payload = {
      facilityCode: code,
      mode,
      specialtyHisId: specialty.id,
      specialtyName: specialty.name,
      doctorHisId: doctor?.id,
      doctorName: doctor?.name,
      roomHisId: room.id,
      roomName: room.name,
      examDate: date,
      slotHisId: slot.id,
      slotLabel: slot.label,
      objectType,
    };
    setBusy('submit');
    setError('');
    try {
      const { id } = await apiFetch<{ id: string }>('/api/booking-drafts', { body: payload });
      router.push(`/dat-kham/ho-so?draft=${id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        sessionStorage.setItem(pendingKey, JSON.stringify(payload));
        router.push(`/dang-nhap?next=${encodeURIComponent(`/dat-kham?co-so=${code}&draft-pending=1`)}`);
      } else setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-8 pb-16">
      <BookingStepper />
      <header className="space-y-2">
        <p className="text-primary text-sm font-semibold">BƯỚC 1 / 4</p>
        <h1 className="text-ink-navy md:text-heading-sm text-[40px] leading-tight font-bold">
          Chọn lịch khám
        </h1>
        <p className="text-slate-gray">Chọn cơ sở, chuyên khoa, ngày và khung giờ phù hợp với bạn.</p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {error && (
            <Alert tone="danger">
              <CircleAlert className="mr-2 inline size-4" aria-hidden />
              {error}
            </Alert>
          )}
          <Card variant="panel" className="space-y-5">
            <BookingPanelHeading icon={Hospital} title="1. Cơ sở khám" />
            <Label htmlFor="facility">Cơ sở y tế</Label>
            <select
              id="facility"
              tabIndex={-1}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                router.replace(`/dat-kham?co-so=${encodeURIComponent(e.target.value)}`);
              }}
              className="sr-only"
            >
              <option value="">Chọn cơ sở</option>
              {facilities.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              {facilities.map((f) => (
                <button
                  key={f.code}
                  type="button"
                  aria-pressed={code === f.code}
                  onClick={() => {
                    setCode(f.code);
                    router.replace(`/dat-kham?co-so=${encodeURIComponent(f.code)}`);
                  }}
                  className={`border-hairline hover:bg-pebble flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors ${code === f.code ? 'border-primary bg-info-bg ring-primary ring-2' : 'bg-card'}`}
                >
                  <span className="bg-pebble border-hairline grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border">
                    {facilityLogos?.[f.code] ? (
                      <Image
                        src={facilityLogos[f.code]!}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="size-full object-contain"
                      />
                    ) : (
                      <Hospital className="text-primary size-6" strokeWidth={1.75} aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <strong className="block leading-snug">{f.name}</strong>
                    <span className="text-slate-gray mt-1 block text-sm leading-5">{f.address}</span>
                  </span>
                </button>
              ))}
            </div>
            {facility && (
              <p className="text-slate-gray flex items-start gap-2 text-sm md:hidden">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {facility.address}
              </p>
            )}
          </Card>
          {code && (
            <Card variant="panel" className="space-y-5">
              <BookingPanelHeading icon={Stethoscope} title="2. Chuyên khoa và phòng khám" />
              <Label htmlFor="specialty-search">Tìm chuyên khoa</Label>
              <Input
                id="specialty-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nhập tên chuyên khoa"
              />
              {busy === 'specialties' ? (
                <Loading />
              ) : visible.length === 0 ? (
                <p className="text-slate-gray">Chưa có chuyên khoa phù hợp.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visible.map((s) => (
                    <Chip key={s.id} active={specialtyId === s.id} onClick={() => setSpecialtyId(s.id)}>
                      <span className="flex items-center gap-2">
                        <SpecialtyChipIcon name={s.name} />
                        {s.name}
                      </span>
                    </Chip>
                  ))}
                </div>
              )}
              {specialtyId && (
                <div className="border-hairline space-y-4 border-t pt-5">
                  {facility?.bookingMode === 'BOTH' && doctors.length > 0 && (
                    <div className="flex gap-2" role="tablist" aria-label="Cách chọn lịch">
                      <Button
                        variant={mode === 'ROOM' ? 'primary' : 'outline'}
                        role="tab"
                        aria-selected={mode === 'ROOM'}
                        onClick={() => {
                          setMode('ROOM');
                          setDoctorId('');
                        }}
                      >
                        Theo phòng khám
                      </Button>
                      <Button
                        variant={mode === 'DOCTOR' ? 'primary' : 'outline'}
                        role="tab"
                        aria-selected={mode === 'DOCTOR'}
                        onClick={() => {
                          setMode('DOCTOR');
                          setRoomId(undefined);
                        }}
                      >
                        Theo bác sĩ
                      </Button>
                    </div>
                  )}
                  {busy === 'choices' ? (
                    <Loading />
                  ) : mode === 'ROOM' ? (
                    rooms.length === 0 ? (
                      <p className="text-slate-gray">Khoa này chưa có phòng khám.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {rooms.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            aria-pressed={roomId === r.id}
                            onClick={() => setRoomId(r.id)}
                            className={`border-hairline min-h-20 rounded-xl border p-4 text-left ${roomId === r.id ? 'border-primary bg-info-bg ring-primary ring-2' : 'bg-card hover:bg-pebble'}`}
                          >
                            <strong className="block">{r.name}</strong>
                            <span className="text-slate-gray mt-1 block text-sm">
                              Giá dịch vụ ngày thường: {formatMoney(r.priceDv)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : doctors.length === 0 ? (
                    <p className="text-slate-gray">
                      Khoa này chưa có lịch bác sĩ. Bạn có thể chọn phòng khám.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {doctors.map((d) => (
                        <Chip key={d.id} active={doctorId === d.id} onClick={() => setDoctorId(d.id)}>
                          {d.name}
                          {d.title ? ` · ${d.title}` : ''}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {(roomId || doctorId) && (
            <Card variant="panel" className="space-y-4">
              <BookingPanelHeading icon={CalendarDays} title="3. Ngày khám" />
              {busy === 'schedules' ? (
                <Loading />
              ) : dates.length === 0 ? (
                <p className="text-slate-gray">Chưa có lịch trong 14 ngày tới.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dates.map((d) => {
                    const day = new Date(`${d}T00:00:00Z`);
                    const weekday = day.getUTCDay();
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={date === d}
                        onClick={() => setDate(d)}
                        className={`border-hairline min-h-20 min-w-20 shrink-0 rounded-xl border p-3 text-center ${date === d ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-ink-navy hover:bg-pebble'}`}
                      >
                        <span className="block text-sm">
                          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][weekday]}
                        </span>
                        <strong className="block text-lg">
                          {d.slice(8)}/{d.slice(5, 7)}
                        </strong>
                        {(weekday === 0 || weekday === 6) && <span className="block text-xs">Cuối tuần</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
          {date && (
            <Card variant="panel" className="space-y-4">
              <BookingPanelHeading icon={Clock3} title="4. Khung giờ" />
              {busy === 'slots' ? (
                <Loading />
              ) : slots.length === 0 ? (
                <p className="text-slate-gray">Ngày này chưa có khung giờ.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <Chip
                      key={s.id}
                      active={slotId === s.id}
                      disabled={s.remaining === 0}
                      onClick={() => setSlotId(s.id)}
                    >
                      {s.label} · {s.remaining === 0 ? 'Đã đầy' : `Còn ${s.remaining} chỗ`}
                    </Chip>
                  ))}
                </div>
              )}
            </Card>
          )}
          {slotId && (
            <Card variant="panel" className="space-y-4">
              <BookingPanelHeading icon={UserRound} title="Đối tượng khám" />
              <div className="flex gap-2">
                <Chip active={objectType === 'DICH_VU'} onClick={() => setObjectType('DICH_VU')}>
                  Dịch vụ
                </Chip>
                {facility?.allowBhyt && bhytEligible && (
                  <Chip active={objectType === 'BHYT'} onClick={() => setObjectType('BHYT')}>
                    BHYT
                  </Chip>
                )}
              </div>
              {room && date && (
                <p className="font-semibold">Giá dự kiến: {formatMoney(priceFor(room, date, objectType))}</p>
              )}
            </Card>
          )}
          <div className="flex justify-end">
            <Button disabled={!slotId || !room || busy === 'submit'} onClick={proceed}>
              {busy === 'submit' && <LoaderCircle className="size-4 animate-spin" aria-hidden />}Tiếp tục
            </Button>
          </div>
        </div>
        <aside aria-label="Tóm tắt lịch khám" className="lg:sticky lg:top-24">
          <BookingSummary
            data={{
              facilityName: facility?.name,
              facilityLogoUrl: facility ? facilityLogos?.[facility.code] : null,
              facilityAddress: facility?.address,
              specialtyName: specialty?.name,
              date: date ? `${date.slice(8)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : undefined,
              time: slot?.label,
              roomName: room?.name,
              amount: room && date ? priceFor(room, date, objectType) : undefined,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
