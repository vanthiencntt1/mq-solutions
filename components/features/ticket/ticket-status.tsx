import { CircleAlert, CircleCheck, Clock3, RotateCcw, XCircle } from 'lucide-react';
import type { AppointmentStatus } from '@/lib/domain/booking/status';
import { STATUS_LABEL } from '@/lib/domain/booking/status';
import { Badge } from '@/components/ui/badge';

export function TicketStatus({
  status,
  cancelRequest = false,
}: {
  status: AppointmentStatus;
  cancelRequest?: boolean;
}) {
  if (cancelRequest)
    return (
      <Badge tone="warning">
        <Clock3 aria-hidden /> Đang xử lý hủy
      </Badge>
    );
  const danger = status === 'DA_HUY' || status === 'QUA_HAN';
  const warning = status === 'CHO_THANH_TOAN' || status === 'LOI_HIS' || status === 'CHO_HOAN_TIEN';
  const success = status === 'DA_CO_STT' || status === 'DA_KHAM' || status === 'DA_HOAN_TIEN';
  const Icon = danger ? XCircle : warning ? CircleAlert : success ? CircleCheck : RotateCcw;
  return (
    <Badge tone={danger ? 'danger' : warning ? 'warning' : success ? 'success' : 'info'}>
      <Icon aria-hidden /> {STATUS_LABEL[status]}
    </Badge>
  );
}
