import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bell, CalendarDays, ClipboardList, Clock3, FileHeart } from 'lucide-react';
import { requirePageSession } from '@/app/_lib/session';
import { FacilityLogo } from '@/components/features/identity/facility-logo';
import { TicketStatus } from '@/components/features/ticket/ticket-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { listActiveFacilities } from '@/lib/services/facility-service';
import { getIdentityService } from '@/lib/services/identity';
import { getNotificationService } from '@/lib/services/notification';
import { getTicketService } from '@/lib/services/ticket';
import { formatDate, formatDateTime, maskName } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tài khoản', robots: { index: false } };

export default async function AccountHome() {
  const session = await requirePageSession();
  const [upcoming, facilities, notifications, directory] = await Promise.all([
    getTicketService().list(session.id, 'upcoming', undefined, 1, 3),
    getIdentityService().listMyFacilities(session.id),
    getNotificationService().list(session.id, 1, 3),
    listActiveFacilities({ take: 100 }),
  ]);
  const logos = new Map(directory.map((facility) => [facility.code, facility.logoUrl]));
  const nextTicket = upcoming.rows[0];
  const shortcuts = [
    { href: '/co-so-y-te', icon: CalendarDays, title: 'Đặt khám mới', description: 'Chọn cơ sở và giờ khám' },
    {
      href: '/tai-khoan/phieu-kham',
      icon: ClipboardList,
      title: 'Phiếu khám',
      description: 'Xem lịch và số thứ tự',
    },
    {
      href: '/tai-khoan/co-so',
      icon: FileHeart,
      title: 'Hồ sơ tại cơ sở',
      description: 'Xem kết quả khám bệnh',
    },
    { href: '/tai-khoan/thong-bao', icon: Bell, title: 'Thông báo', description: 'Theo dõi cập nhật mới' },
  ];

  return (
    <div className="min-w-0 space-y-12 pb-8 md:space-y-16">
      <header className="space-y-2">
        <p className="text-slate-gray">Xin chào, {maskName(session.fullName)}</p>
        <h1 className="text-ink-navy text-[38px] leading-tight font-bold md:text-[50px]">
          Tài khoản của tôi
        </h1>
        <p className="text-slate-gray">Theo dõi lịch khám và hồ sơ của bạn tại các cơ sở y tế.</p>
      </header>

      <section className="space-y-6" aria-labelledby="upcoming-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="upcoming-title" className="section-title">
            Phiếu khám sắp tới
          </h2>
          {upcoming.rows.length > 0 ? (
            <Link
              href="/tai-khoan/phieu-kham"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
            >
              Tất cả phiếu <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
        {nextTicket ? (
          <div className="relative isolate">
            <div
              aria-hidden
              className="bg-sky-cyan/20 absolute -top-4 -right-3 -z-10 size-32 rounded-full blur-3xl"
            />
            <Card className="overflow-hidden p-0 shadow-lg">
              <div className="grid md:grid-cols-[minmax(0,1fr)_190px]">
                <div className="space-y-5 p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FacilityLogo
                        name={nextTicket.facilityName}
                        logoUrl={logos.get(nextTicket.facilityCode)}
                      />
                      <div className="min-w-0">
                        <p className="text-slate-gray text-sm">Mã phiếu {nextTicket.code}</p>
                        <h3 className="text-ink-navy text-xl font-bold">{nextTicket.facilityName}</h3>
                      </div>
                    </div>
                    <TicketStatus status={nextTicket.status} cancelRequest={nextTicket.cancelRequest} />
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <CalendarDays className="text-primary size-5 shrink-0" aria-hidden />
                      {formatDate(nextTicket.examDate)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 className="text-primary size-5 shrink-0" aria-hidden />
                      {nextTicket.slotLabel}
                    </p>
                    <p className="text-slate-gray sm:col-span-2">
                      {nextTicket.specialtyName} · {nextTicket.roomName}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/tai-khoan/phieu-kham/${nextTicket.code}`}>
                      Xem phiếu khám <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
                <div className="border-hairline bg-info-bg/50 flex flex-col items-center justify-center border-t p-6 md:border-t-0 md:border-l">
                  <span className="text-info text-xs font-semibold tracking-wide">SỐ THỨ TỰ</span>
                  <span
                    className="text-ink-navy tabular mt-1 text-[68px] leading-none font-bold"
                    aria-label={nextTicket.stt ? `Số thứ tự ${nextTicket.stt}` : 'Chưa có số thứ tự'}
                  >
                    {nextTicket.stt ?? '—'}
                  </span>
                  <span className="text-slate-gray mt-2 text-center text-xs">Theo phiếu tại cơ sở</span>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Chưa có lịch khám sắp tới"
            description="Chọn cơ sở và giờ khám phù hợp với bạn."
            action={
              <Button asChild>
                <Link href="/co-so-y-te">Đặt khám ngay</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="space-y-6" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="section-title">
          Truy cập nhanh
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="border-hairline bg-paper hover:border-primary/40 flex min-h-24 items-center gap-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <IconTile>
                <Icon aria-hidden />
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="text-ink-navy block text-lg font-bold">{title}</span>
                <span className="text-slate-gray block text-sm">{description}</span>
              </span>
              <ArrowRight className="text-primary size-5 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {notifications.rows.length > 0 ? (
        <section className="space-y-6" aria-labelledby="notifications-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="notifications-title" className="section-title">
              Thông báo gần đây
            </h2>
            <Link
              href="/tai-khoan/thong-bao"
              className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
            >
              Xem tất cả <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <Card variant="panel" className="divide-hairline p-0">
            {notifications.rows.map((notice) => (
              <div key={notice.id} className="border-hairline flex gap-3 border-b p-5 last:border-b-0">
                <IconTile size="sm">
                  <Bell aria-hidden />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-navy font-semibold">{notice.title}</p>
                  <p className="text-slate-gray mt-1 line-clamp-2 text-sm">{notice.body}</p>
                  <p className="text-slate-gray mt-2 text-xs">{formatDateTime(notice.createdAt)}</p>
                </div>
                {!notice.readAt ? (
                  <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" aria-label="Chưa đọc" />
                ) : null}
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {facilities.length > 0 ? (
        <section className="space-y-6" aria-labelledby="facilities-title">
          <h2 id="facilities-title" className="section-title">
            Cơ sở đã đặt khám
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {facilities.map((facility) => (
              <Link
                key={facility.code}
                href={`/tai-khoan/co-so/${facility.code}`}
                className="border-hairline bg-paper hover:border-primary/40 flex min-h-28 items-center gap-4 rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <FacilityLogo name={facility.name} logoUrl={logos.get(facility.code)} />
                <span className="min-w-0">
                  <span className="text-ink-navy block text-lg font-bold">{facility.name}</span>
                  <span className="text-slate-gray mt-1 block text-sm">
                    Lần đặt khám gần nhất: {formatDate(facility.lastExamDate)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
