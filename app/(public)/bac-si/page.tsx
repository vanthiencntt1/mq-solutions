import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Clock3, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { DoctorCard } from '@/components/features/doctor/DoctorCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Đặt khám theo bác sĩ | MQ Solutions',
  description: 'Chọn bác sĩ, xem lịch khám sắp tới và đặt lịch trực tuyến.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ 'co-so'?: string; 'chuyen-khoa'?: string; ngay?: string; sapxep?: string }>;
}) {
  const parsed = z
    .object({
      'co-so': z.string().max(80).optional(),
      'chuyen-khoa': z.string().max(100).optional(),
      ngay: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      sapxep: z.enum(['name', 'price']).optional(),
    })
    .safeParse(await searchParams);
  const params = parsed.success
    ? parsed.data
    : { 'co-so': undefined, 'chuyen-khoa': undefined, ngay: undefined, sapxep: undefined };
  const service = getFacilityPublicService();
  const [facilities, specialties, doctors] = await Promise.all([
    service.listFacilities(),
    service.specialtyGroups(),
    service.doctors({
      facility: params['co-so'],
      specialty: params['chuyen-khoa'],
      date: /^\d{4}-\d{2}-\d{2}$/.test(params.ngay ?? '') ? params.ngay : undefined,
      sort: params.sapxep,
    }),
  ]);
  const availableFacilities = facilities.filter(
    (facility) =>
      facility.status === 'ACTIVE' && facility.health !== 'DOWN' && facility.bookingMode !== 'SPECIALTY',
  );
  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-3xl">
        <p className="text-info text-sm font-semibold">KHÁM THEO BÁC SĨ</p>
        <h1 className="text-ink-navy mt-3 text-[32px] font-bold md:text-[50px]">Chủ động chọn bác sĩ</h1>
        <p className="text-slate-gray mt-4 text-lg">
          Xem lịch khám sắp tới, chọn thời gian phù hợp và đặt lịch với bác sĩ bạn tin tưởng.
        </p>
      </header>
      <ul className="text-slate-gray mt-8 grid gap-3 text-sm md:grid-cols-3">
        <li className="flex items-center gap-2">
          <CalendarDays className="text-info size-5" aria-hidden /> Chọn lịch sớm, thuận tiện hơn
        </li>
        <li className="flex items-center gap-2">
          <Clock3 className="text-info size-5" aria-hidden /> Chủ động thời gian khám
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="text-info size-5" aria-hidden /> Xem rõ thông tin trước khi đặt
        </li>
      </ul>
      <form
        action="/bac-si"
        method="get"
        className="border-border bg-card mt-10 grid gap-4 rounded-2xl border p-4 shadow-sm md:grid-cols-4 md:items-end md:p-6"
      >
        <div>
          <Label htmlFor="doctor-facility">Cơ sở y tế</Label>
          <select
            id="doctor-facility"
            name="co-so"
            defaultValue={params['co-so'] ?? ''}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          >
            <option value="">Tất cả cơ sở</option>
            {availableFacilities.map((facility) => (
              <option key={facility.code} value={facility.code}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="doctor-specialty">Chuyên khoa</Label>
          <select
            id="doctor-specialty"
            name="chuyen-khoa"
            defaultValue={params['chuyen-khoa'] ?? ''}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          >
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="doctor-date">Ngày có lịch</Label>
          <input
            id="doctor-date"
            type="date"
            name="ngay"
            defaultValue={params.ngay ?? ''}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          />
        </div>
        <div>
          <Label htmlFor="doctor-sort">Sắp xếp</Label>
          <select
            id="doctor-sort"
            name="sapxep"
            defaultValue={params.sapxep ?? 'name'}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          >
            <option value="name">Theo tên</option>
            <option value="price">Giá thấp trước</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <Button type="submit">Lọc bác sĩ</Button>
        </div>
      </form>
      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-slate-gray">{doctors.length} bác sĩ phù hợp</p>
        <Link href="/bac-si" className="text-info text-sm font-semibold hover:underline">
          Xóa bộ lọc
        </Link>
      </div>
      {doctors.length ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((entry) => (
            <DoctorCard key={`${entry.facility.code}:${entry.doctor.id}`} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-5 rounded-xl border p-8">
          <p className="text-ink-navy font-semibold">Chưa có bác sĩ phù hợp.</p>
          <p className="text-slate-gray mt-2">Hãy thử cơ sở, chuyên khoa hoặc ngày khác.</p>
        </div>
      )}
    </div>
  );
}
