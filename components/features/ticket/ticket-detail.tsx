import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  Clock3,
  CreditCard,
  Hospital,
  MapPin,
  UserRound,
} from 'lucide-react';
import type { TicketDetailView } from '@/lib/domain/booking/cancel-types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';
import { TicketActions } from './ticket-actions';
import { TicketStatus } from './ticket-status';

export function TicketDetail({ ticket }: { ticket: TicketDetailView }) {
  const online = ticket.payMethod === 'ONLINE';
  const paymentLabel = online
    ? ticket.status === 'DA_HOAN_TIEN'
      ? 'Đã hoàn tiền'
      : ticket.isPaid
        ? 'Đã thanh toán online'
        : 'Đang chờ thanh toán online'
    : `Thanh toán tại quầy: ${formatMoney(ticket.amount)}`;
  return (
    <div className="space-y-6">
      <Link
        href="/tai-khoan/phieu-kham"
        className="text-slate-gray hover:text-primary inline-flex items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> Tất cả phiếu khám
      </Link>
      <Card className="overflow-hidden rounded-3xl p-0 shadow-lg">
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b p-6">
          <div>
            <p className="text-primary text-sm font-semibold">PHIẾU KHÁM ĐIỆN TỬ</p>
            <h1 className="mt-1 text-[28px] font-bold">{ticket.facilityName}</h1>
            <p className="text-slate-gray mt-1">Mã phiếu {ticket.code}</p>
          </div>
          <TicketStatus status={ticket.status} cancelRequest={ticket.cancelRequest} />
        </div>
        <div className="grid md:grid-cols-[1fr_240px]">
          <section className="space-y-6 p-6">
            <div className="bg-info-bg rounded-2xl p-6 text-center md:text-left">
              <p className="text-info text-sm font-semibold">SỐ THỨ TỰ KHÁM</p>
              <p className="text-ink-navy mt-1 text-[68px] leading-none font-bold">{ticket.stt ?? '—'}</p>
              <p className="text-slate-gray mt-3 text-sm">Vui lòng đến trước giờ khám 15 phút.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                icon={CalendarDays}
                label="Ngày và khung giờ"
                value={`${formatDate(ticket.examDate)} · ${ticket.slotLabel}`}
              />
              <InfoRow
                icon={Hospital}
                label="Chuyên khoa · phòng khám"
                value={`${ticket.specialtyName} · ${ticket.roomName}`}
              />
              <InfoRow
                icon={UserRound}
                label="Người khám"
                value={`${ticket.nameMasked} · ${ticket.birthYear}${ticket.maBNMasked ? ` · MaBN ${ticket.maBNMasked}` : ''}`}
              />
              <InfoRow icon={MapPin} label="Địa chỉ cơ sở" value={ticket.facilityAddress} />
            </div>
            {ticket.doctorName ? (
              <p className="text-slate-gray text-sm">
                Bác sĩ: <strong className="text-ink-navy">{ticket.doctorName}</strong>
              </p>
            ) : null}
          </section>
          <aside className="border-border bg-cloud flex flex-col items-center justify-center border-t p-6 md:border-t-0 md:border-l">
            <div className="rounded-xl bg-white p-3">
              <Image
                src={`data:image/svg+xml,${encodeURIComponent(ticket.qrSvg)}`}
                alt={`Mã QR phiếu ${ticket.code}`}
                width={184}
                height={184}
                unoptimized
              />
            </div>
            <p className="mt-3 text-center text-sm font-semibold">Đưa mã này tại quầy tiếp nhận</p>
            <p className="text-slate-gray mt-1 text-center text-xs">
              Quầy kiểm tra chữ ký trước khi check-in.
            </p>
          </aside>
        </div>
        <div className="border-border grid gap-4 border-t p-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="text-primary size-5" aria-hidden />
              <h2 className="font-semibold">Thanh toán</h2>
            </div>
            <p className="mt-2">{paymentLabel}</p>
            <Badge tone={online && ticket.isPaid ? 'success' : 'warning'} className="mt-2">
              {online && ticket.isPaid ? <CircleCheck aria-hidden /> : <Clock3 aria-hidden />}
              {online ? paymentLabel : 'Thanh toán tại cơ sở'}
            </Badge>
          </div>
          <div>
            <h2 className="font-semibold">Đối tượng khám</h2>
            <p className="mt-2">{ticket.objectType === 'BHYT' ? 'Bảo hiểm y tế' : 'Dịch vụ'}</p>
            {ticket.objectType === 'BHYT' ? (
              <p className="text-slate-gray mt-1 text-sm">Mang theo CCCD và thẻ BHYT khi đến khám.</p>
            ) : null}
          </div>
        </div>
      </Card>
      {ticket.cancelRequest ? (
        <Card className="border-warning bg-warning-bg">
          <p className="font-semibold">Cơ sở đang xử lý yêu cầu hủy</p>
          <p className="text-sm">Phiếu vẫn có hiệu lực đến khi cơ sở xác nhận hủy trên HIS.</p>
        </Card>
      ) : null}
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Trước khi đến khám</h2>
        <ul className="text-slate-gray list-inside list-disc space-y-1 text-sm">
          <li>Mang CCCD và giấy tờ BHYT nếu đăng ký khám BHYT.</li>
          <li>Đến trước giờ khám 15 phút để làm thủ tục.</li>
          <li>Xuất trình mã QR hoặc mã phiếu tại quầy tiếp nhận.</li>
        </ul>
        <p className="text-slate-gray text-sm">
          Hạn tự hủy: {formatDateTime(ticket.cancelDeadline)}. Sau thời điểm này, liên hệ cơ sở
          {ticket.facilityHotline ? ` qua ${ticket.facilityHotline}` : ''}.
        </p>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link className="hover:text-primary underline" href="/huong-dan">
            Hướng dẫn đi khám
          </Link>
          <Link className="hover:text-primary underline" href={`/tai-khoan/co-so/${ticket.facilityCode}`}>
            Xem hồ sơ tại cơ sở
          </Link>
        </div>
        <TicketActions
          code={ticket.code}
          canCancel={ticket.canCancel}
          canRefresh={ticket.status === 'DA_CO_STT'}
        />
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="text-slate-gray text-sm">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
