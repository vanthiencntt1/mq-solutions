import type { Metadata } from 'next';
import { FacilityIdentifyCard } from '@/components/features/identity/facility-identify-card';
import { listActiveFacilities } from '@/lib/services/facility-service';
import { getIdentityService } from '@/lib/services/identity';
import { formatDate } from '@/lib/utils/format';
import { requirePageSession } from '@/app/_lib/session';

export const metadata: Metadata = { title: 'Hồ sơ tại cơ sở' };
export const dynamic = 'force-dynamic';

// Chọn cơ sở → tra hồ sơ qua ApiDatKham, không lưu liên kết (C03). Cơ sở đã đặt khám hiện trước.
export default async function FacilitiesPage() {
  const s = await requirePageSession();
  const [facilities, recent] = await Promise.all([
    listActiveFacilities(),
    getIdentityService().listMyFacilities(s.id),
  ]);
  const lastExam = new Map(recent.map((r) => [r.code, r.lastExamDate]));
  const sorted = [...facilities].sort((a, b) => Number(lastExam.has(b.code)) - Number(lastExam.has(a.code)));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-tight">Hồ sơ tại cơ sở</h1>
        <p className="text-slate-gray max-w-2xl">
          Chọn cơ sở để kiểm tra bạn đã có hồ sơ chưa. Kết quả chỉ dùng trong phiên làm việc, hệ thống không
          lưu liên kết hồ sơ.
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-slate-gray">Chưa có cơ sở nào đang hoạt động.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((f) => {
            const last = lastExam.get(f.code);
            return (
              <FacilityIdentifyCard
                key={f.code}
                code={f.code}
                name={f.name}
                address={f.address}
                hint={last ? `Lần đặt khám gần nhất: ${formatDate(last)}` : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
