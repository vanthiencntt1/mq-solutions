import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, ClipboardList, FileHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { requirePageSession } from '@/app/_lib/session';
import { TicketStatus } from '@/components/features/ticket/ticket-status';
import { getIdentityService } from '@/lib/services/identity';
import { getTicketService } from '@/lib/services/ticket';
import { formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tài khoản', robots: { index: false } };

// W08 mục 1: tổng quan lấy cùng một phiên, không nhận accountId từ trình duyệt.
export default async function AccountHome() {
  const s = await requirePageSession();
  const [upcoming, facilities] = await Promise.all([
    getTicketService().list(s.id, 'upcoming', undefined, 1, 3),
    getIdentityService().listMyFacilities(s.id),
  ]);
  const tiles = [
    {
      href: '/co-so-y-te',
      icon: Building2,
      title: 'Đặt khám',
      desc: 'Chọn cơ sở, chuyên khoa, ngày giờ khám',
    },
    {
      href: '/tai-khoan/phieu-kham',
      icon: ClipboardList,
      title: 'Phiếu khám',
      desc: 'Xem STT, mã QR, trạng thái phiếu',
    },
    {
      href: '/tai-khoan/co-so',
      icon: FileHeart,
      title: 'Hồ sơ khám bệnh',
      desc: 'Lần khám, xét nghiệm, toa thuốc tại từng cơ sở',
    },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-gray">Xin chào,</p>
        <h1 className="text-[28px]">Tài khoản của tôi</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tiles.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card className="h-full space-y-2 transition-shadow hover:shadow-md">
              <Icon className="text-primary size-6" aria-hidden />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
      <section className="space-y-4" aria-labelledby="upcoming-title">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming-title" className="text-[22px] font-bold">
            Phiếu khám sắp tới
          </h2>
          <Link
            href="/tai-khoan/phieu-kham"
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
          >
            Tất cả phiếu <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {upcoming.rows.length ? (
          <div className="grid gap-3">
            {upcoming.rows.map((ticket) => (
              <Link key={ticket.code} href={`/tai-khoan/phieu-kham/${ticket.code}`}>
                <Card className="flex flex-wrap items-center justify-between gap-4 rounded-2xl transition-shadow hover:shadow-md">
                  <div>
                    <p className="text-slate-gray text-sm">
                      {ticket.code} · {ticket.facilityName}
                    </p>
                    <CardTitle className="mt-1">{ticket.specialtyName}</CardTitle>
                    <p className="text-slate-gray mt-2 flex items-center gap-2 text-sm">
                      <CalendarDays className="text-primary size-4" aria-hidden />
                      {formatDate(ticket.examDate)} · {ticket.slotLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <TicketStatus status={ticket.status} cancelRequest={ticket.cancelRequest} />
                    {ticket.stt ? (
                      <p className="text-ink-navy text-4xl font-bold" aria-label={`Số thứ tự ${ticket.stt}`}>
                        {ticket.stt}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Chưa có lịch khám sắp tới</CardTitle>
              <CardDescription className="mt-1">Chọn cơ sở để đặt lịch khám phù hợp.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/co-so-y-te">Đặt khám ngay</Link>
            </Button>
          </Card>
        )}
      </section>
      <section className="space-y-4" aria-labelledby="facilities-title">
        <h2 id="facilities-title" className="text-[22px] font-bold">
          Cơ sở đã đặt khám
        </h2>
        {facilities.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {facilities.map((facility) => (
              <Link key={facility.code} href={`/tai-khoan/co-so/${facility.code}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <Building2 className="text-primary mb-3 size-6" aria-hidden />
                  <CardTitle>{facility.name}</CardTitle>
                  <CardDescription className="mt-2">
                    Lần khám gần nhất: {formatDate(facility.lastExamDate)}
                  </CardDescription>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardDescription>Các cơ sở bạn từng đặt khám sẽ xuất hiện ở đây.</CardDescription>
          </Card>
        )}
      </section>
    </div>
  );
}
