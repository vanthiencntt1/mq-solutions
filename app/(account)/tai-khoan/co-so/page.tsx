import type { Metadata } from 'next';
import { FacilityIdentifyCard } from '@/components/features/identity/facility-identify-card';
import { listActiveFacilities } from '@/lib/services/facility-service';
import { getIdentityService } from '@/lib/services/identity';
import { formatDate } from '@/lib/utils/format';
import { requirePageSession } from '@/app/_lib/session';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';

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
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-[38px] leading-tight md:text-[50px]">Hồ sơ tại cơ sở</h1>
        <p className="text-slate-gray max-w-2xl">
          Hệ thống tự kiểm tra hồ sơ của bạn tại từng cơ sở. Cơ sở đã có hồ sơ có thể xem ngay các lần khám.
          Kết quả chỉ dùng trong phiên làm việc, hệ thống không lưu liên kết hồ sơ.
        </p>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có cơ sở y tế" description="Vui lòng quay lại sau." />
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
                logoUrl={f.logoUrl}
                hint={last ? `Lần đặt khám gần nhất: ${formatDate(last)}` : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
