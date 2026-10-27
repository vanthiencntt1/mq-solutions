import type { BookingView } from '@/lib/domain/booking/confirm';
import { formatDate, formatMoney } from '@/lib/utils/format';

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

// C06 mục 5: email không mang CCCD, MaBN, SĐT hay tên bệnh nhân.
export function bookingConfirmedMail(view: BookingView) {
  return {
    subject: `Đặt khám thành công – ${view.code}`,
    html: `<p>Đặt khám thành công tại ${escape(view.facilityName)}.</p><p>Mã phiếu: <strong>${escape(view.code)}</strong>. STT: <strong>${view.stt ?? ''}</strong>.</p><p>Ngày khám: ${formatDate(`${view.examDate}T00:00:00+07:00`)} · ${escape(view.slotLabel)} · ${escape(view.roomName)}.</p><p>${view.payMethod === 'AT_FACILITY' ? `Vui lòng đến quầy thu ngân đóng ${formatMoney(view.amount)} trước giờ khám.` : 'Bạn đã thanh toán, vui lòng đến phòng khám trước giờ hẹn 15 phút.'}</p>${view.objectType === 'BHYT' ? '<p>Mang thẻ BHYT hoặc CCCD gắn chip và giấy chuyển tuyến (nếu có).</p>' : ''}`,
  };
}
