import { Activity, CircleAlert, CircleCheck, CircleHelp, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/format';
type FacilityHealth = {
  id: string;
  code: string;
  name: string;
  health: string;
  lastOkAt: string | null;
  latencyMs: number | null;
  checks: number;
  errors: number;
  errorRate: number;
  outboxPending: number;
};

export function HealthList({ rows }: { rows: FacilityHealth[] }) {
  if (rows.length === 0)
    return <p className="text-slate-gray py-6 text-sm">Chưa có cơ sở trong phạm vi của bạn.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead>
          <tr className="text-slate-gray border-border border-b text-xs">
            <th className="py-3 pr-4 font-semibold">Cơ sở</th>
            <th className="py-3 pr-4 font-semibold">Kết nối</th>
            <th className="py-3 pr-4 font-semibold">Độ trễ TB</th>
            <th className="py-3 pr-4 font-semibold">Lỗi / 1 giờ</th>
            <th className="py-3 pr-4 font-semibold">Lần OK cuối</th>
            <th className="py-3 font-semibold">Outbox</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const state =
              row.health === 'OK'
                ? { label: 'Ổn định', tone: 'success' as const, Icon: CircleCheck }
                : row.health === 'DEGRADED'
                  ? { label: 'Chập chờn', tone: 'warning' as const, Icon: Activity }
                  : row.health === 'DOWN'
                    ? { label: 'Mất kết nối', tone: 'danger' as const, Icon: CircleAlert }
                    : { label: 'Chưa xác định', tone: 'neutral' as const, Icon: CircleHelp };
            return (
              <tr key={row.id} className="border-border border-b last:border-b-0">
                <td className="py-3 pr-4 font-medium">
                  {row.name}
                  <span className="text-slate-gray block text-xs">{row.code}</span>
                </td>
                <td className="py-3 pr-4">
                  <Badge tone={state.tone}>
                    <state.Icon size={13} />
                    {state.label}
                  </Badge>
                </td>
                <td className="py-3 pr-4">{row.latencyMs === null ? '—' : `${row.latencyMs} ms`}</td>
                <td className="py-3 pr-4">
                  {row.errors}/{row.checks} ({Math.round(row.errorRate * 100)}%)
                </td>
                <td className="py-3 pr-4">{row.lastOkAt ? formatDateTime(row.lastOkAt) : 'Chưa có'} </td>
                <td className="py-3">
                  {row.outboxPending ? (
                    <Badge tone="warning">
                      <Clock3 size={13} />
                      {row.outboxPending} đang chờ
                    </Badge>
                  ) : (
                    '0'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
