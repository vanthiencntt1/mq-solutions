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
  const booked = facilities.filter((f) => lastExam.has(f.code));
  const other = facilities.filter((f) => !lastExam.has(f.code));

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-2">
        <h1 className="text-[38px] leading-tight md:text-[50px]">Hồ sơ tại cơ sở</h1>
        <p className="text-slate-gray max-w-2xl">
          Chọn cơ sở để kiểm tra hồ sơ của bạn. Cơ sở đã có hồ sơ có thể xem ngay các lần khám. Kết quả chỉ
          dùng trong phiên làm việc, hệ thống không lưu liên kết hồ sơ.
        </p>
      </div>
      {facilities.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có cơ sở y tế" description="Vui lòng quay lại sau." />
      ) : (
        <div className="space-y-8">
          {[
            { title: 'Cơ sở bạn đã đặt khám', rows: booked },
            { title: 'Cơ sở khác', rows: other },
          ].map(
            (group) =>
              group.rows.length > 0 && (
                <section key={group.title} className="space-y-2">
                  <h2 className="text-ink-navy text-xl font-semibold">{group.title}</h2>
                  {group.rows.map((f) => (
                    <FacilityIdentifyCard
                      key={f.code}
                      code={f.code}
                      name={f.name}
                      address={f.address}
                      logoUrl={f.logoUrl}
                      hint={
                        lastExam.get(f.code) ? `Đặt gần nhất ${formatDate(lastExam.get(f.code)!)}` : undefined
                      }
                    />
                  ))}
                </section>
              ),
          )}
        </div>
      )}
    </div>
  );
}
